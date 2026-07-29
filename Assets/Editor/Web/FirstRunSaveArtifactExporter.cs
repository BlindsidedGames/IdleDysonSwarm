/*
 * Purpose: Generates the Web first-run save artifact from Unity-owned defaults through the production save pipeline.
 * Runs: Unity Editor interactively or in batch mode.
 * Primary entry points: ExportMenu and ExportBatch.
 * Owns: Deterministic first-run construction, artifact verification, hashing, and provenance output.
 * Delegates: Default values and pre-save packing to Oracle, compaction to SaveSnapshotBuilder, and canonical IDB1
 * preparation to Oracle.CreateSavePreparationPipeline through a reflection-only editor bridge.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.cs and Oracle.Migrations.cs.
 * - Assets/Scripts/Systems/Save/SaveSnapshotBuilder.cs, SavePreparationPipeline.cs, and SaveCodec.cs.
 * - Assets/Scripts/Systems/Skills/SkillBitsetUtility.cs.
 * - Web/src/game-data/generated/*.json and Web/src/application/firstRun/generated/*.
 *
 * Change notes:
 * - Do not copy gameplay defaults into this exporter; Oracle.SaveDataSettings constructors remain authoritative.
 * - Changing the production schema or save pipeline requires regenerating and recommitting both generated files.
 * - The fixed dateStarted value is lifecycle metadata used only to make generation reproducible.
 * - Artifact and catalog hashes are consumed by Web parity tests; path or format changes must update those tests.
 */

using System;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using Expansion;
using Systems.Save;
using UnityEditor;
using UnityEngine;

namespace Web
{
    /// <summary>
    /// Exports a reproducible schema-current first-run IDB1 save and its provenance manifest.
    /// </summary>
    public static class FirstRunSaveArtifactExporter
    {
        private const string ArtifactRelativePath =
            "Web/src/application/firstRun/generated/first-run-schema-12.idb1.txt";
        private const string ManifestRelativePath =
            "Web/src/application/firstRun/generated/first-run-schema-12.provenance.json";
        private const string FixedFirstRunUtc = "2000-01-01T00:00:00.0000000Z";
        private const string ExportMethod = "Web.FirstRunSaveArtifactExporter.ExportBatch";

        private static readonly string[] CatalogRelativePaths =
        {
            "Web/src/game-data/generated/catalog.json",
            "Web/src/game-data/generated/legacy-id-maps.json",
            "Web/src/game-data/generated/skill-migration-data.json"
        };

        private static readonly string[] LifecycleMetadataPaths =
        {
            "$.dateStarted",
            "$.dateQuitString",
            "$.lastSuccessfulLoadUtc",
            "$.lastNumericRepairUtc"
        };

        /// <summary>
        /// Generates the artifact from the Unity Editor menu.
        /// </summary>
        [MenuItem("Tools/Web/Export First-Run Save Artifact")]
        public static void ExportMenu()
        {
            Export();
            AssetDatabase.Refresh();
        }

        /// <summary>
        /// Generates the artifact from a headless Unity <c>-executeMethod</c> invocation.
        /// </summary>
        public static void ExportBatch()
        {
            try
            {
                Export();
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
                EditorApplication.Exit(1);
                throw;
            }
        }

        /// <summary>
        /// Runs deterministic construction twice, verifies the result, and writes the artifact and provenance.
        /// </summary>
        private static void Export()
        {
            string repositoryRoot = GetRepositoryRoot();
            ExportedSave first = BuildPreparedSave();
            ExportedSave second = BuildPreparedSave();

            if (!string.Equals(first.CanonicalText, second.CanonicalText, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "First-run save generation is not deterministic within one Unity process.");
            }

            VerifyRoundTrip(first);

            string artifactPath = ResolveRepositoryPath(repositoryRoot, ArtifactRelativePath);
            string manifestPath = ResolveRepositoryPath(repositoryRoot, ManifestRelativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(artifactPath) ??
                                      throw new InvalidOperationException("Artifact directory could not be resolved."));
            File.WriteAllText(artifactPath, first.CanonicalText, new UTF8Encoding(false));

            FirstRunProvenance provenance = BuildProvenance(repositoryRoot, artifactPath, first);
            string json = JsonUtility.ToJson(provenance, true).Replace("\r\n", "\n") + "\n";
            File.WriteAllText(manifestPath, json, new UTF8Encoding(false));

            Debug.Log(
                $"[WebFirstRun] Exported schema {first.Schema} artifact to '{ArtifactRelativePath}' " +
                $"with SHA-256 {provenance.artifactSha256}.");
        }

        /// <summary>
        /// Constructs Unity-owned defaults and passes them through snapshot compaction and production preparation.
        /// </summary>
        /// <returns>The canonical text and prepared settings produced by the production pipeline.</returns>
        private static ExportedSave BuildPreparedSave()
        {
            int schema = GetCurrentSaveSchema();
            var defaults = new Oracle.SaveDataSettings
            {
                saveVersion = schema,
                dateStarted = DateTime.Parse(
                        FixedFirstRunUtc,
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal)
                    .ToString(CultureInfo.InvariantCulture)
            };

            PreparedSaveResult prepared = PrepareThroughProductionSavePath(defaults);
            if (prepared == null || !prepared.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Production save preparation failed: {prepared?.FailureReason} {prepared?.Error}");
            }

            if (prepared.PreparedSchema != schema)
            {
                throw new InvalidOperationException(
                    $"Prepared schema {prepared.PreparedSchema} did not match Unity schema {schema}.");
            }

            if (!prepared.CanonicalText.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Production preparation did not emit uppercase IDB1.");
            }

            return new ExportedSave(prepared.CanonicalText, prepared.Settings, schema);
        }

        /// <summary>
        /// Runs the same pre-save packing, snapshot compaction, and Oracle-bound preparation used by canonical saves.
        /// </summary>
        /// <param name="defaults">The Unity-owned first-run settings.</param>
        /// <returns>The classified production preparation result.</returns>
        private static PreparedSaveResult PrepareThroughProductionSavePath(
            Oracle.SaveDataSettings defaults)
        {
            Oracle previousOracle = Oracle.oracle;
            var host = new GameObject("WebFirstRunSaveArtifactExporter");
            try
            {
                Oracle oracle = host.AddComponent<Oracle>();
                oracle.saveSettings = defaults;
                InvokeOracleMethod(oracle, "SaveDictionaries");
                InvokeOracleMethod(oracle, "PackSettingsFlags");

                Oracle.SaveDataSettings snapshot = SaveSnapshotBuilder.CreateSaveSnapshotForStorage(
                    oracle.saveSettings,
                    includeBase64Fields: false,
                    buildOwnedBitsetFromRuntime: () =>
                        InvokeOracleMethod<byte[]>(oracle, "BuildOwnedBitsetFromRuntime"),
                    getAutoAssignmentSkillIds: oracle.GetAutoAssignmentSkillIds);

                var pipeline = InvokeOracleMethod<SavePreparationPipeline>(
                    oracle,
                    "CreateSavePreparationPipeline");
                return pipeline.PrepareSettings(snapshot);
            }
            finally
            {
                Oracle.oracle = previousOracle;
                UnityEngine.Object.DestroyImmediate(host);
            }
        }

        /// <summary>
        /// Invokes a parameterless private Oracle method used by the production save path.
        /// </summary>
        /// <param name="oracle">The temporary Oracle instance.</param>
        /// <param name="methodName">The private production method name.</param>
        private static void InvokeOracleMethod(Oracle oracle, string methodName)
        {
            MethodInfo method = GetOracleMethod(methodName);
            method.Invoke(oracle, null);
        }

        /// <summary>
        /// Invokes a parameterless private Oracle method and returns its typed result.
        /// </summary>
        /// <typeparam name="T">The expected production method result type.</typeparam>
        /// <param name="oracle">The temporary Oracle instance.</param>
        /// <param name="methodName">The private production method name.</param>
        /// <returns>The typed production method result.</returns>
        private static T InvokeOracleMethod<T>(Oracle oracle, string methodName)
        {
            object result = GetOracleMethod(methodName).Invoke(oracle, null);
            if (result is not T typed)
            {
                throw new InvalidOperationException(
                    $"Oracle.{methodName} did not return {typeof(T).FullName}.");
            }

            return typed;
        }

        /// <summary>
        /// Resolves one parameterless private Oracle production method.
        /// </summary>
        /// <param name="methodName">The method name to resolve.</param>
        /// <returns>The reflected method.</returns>
        private static MethodInfo GetOracleMethod(string methodName)
        {
            MethodInfo method = typeof(Oracle).GetMethod(
                    methodName,
                    BindingFlags.Instance | BindingFlags.NonPublic);
            if (method == null)
            {
                throw new MissingMethodException(
                    typeof(Oracle).FullName,
                    methodName);
            }

            if (method.GetParameters().Length != 0)
            {
                throw new InvalidOperationException(
                    $"Oracle.{methodName} is no longer parameterless.");
            }

            return method;
        }

        /// <summary>
        /// Resolves the current save schema from the production Oracle constant.
        /// </summary>
        /// <returns>The current production schema number.</returns>
        private static int GetCurrentSaveSchema()
        {
            FieldInfo field = typeof(Oracle).GetField(
                "CurrentSaveVersion",
                BindingFlags.Static | BindingFlags.NonPublic);
            object value = field?.GetRawConstantValue();
            if (value is not int schema || schema < 1)
            {
                throw new InvalidOperationException(
                    "Oracle.CurrentSaveVersion could not be resolved as a positive integer.");
            }

            return schema;
        }

        /// <summary>
        /// Verifies that the canonical artifact decodes back to the same schema and fixed lifecycle origin.
        /// </summary>
        /// <param name="exported">The produced save and prepared settings.</param>
        private static void VerifyRoundTrip(ExportedSave exported)
        {
            if (!SaveCodec.TryDecodeSaveSettings(
                    exported.CanonicalText,
                    out Oracle.SaveDataSettings decoded,
                    out SaveDecodeFailureReason failure))
            {
                throw new InvalidOperationException($"Generated IDB1 failed to decode: {failure}.");
            }

            if (decoded.saveVersion != exported.Schema)
            {
                throw new InvalidOperationException(
                    $"Decoded schema {decoded.saveVersion} did not match {exported.Schema}.");
            }

            if (!string.Equals(
                    decoded.dateStarted,
                    exported.Settings.dateStarted,
                    StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Decoded dateStarted did not match the prepared first-run lifecycle origin.");
            }
        }

        /// <summary>
        /// Builds the deterministic provenance record for the generated save and Unity data catalogs.
        /// </summary>
        /// <param name="repositoryRoot">The absolute repository root.</param>
        /// <param name="artifactPath">The absolute generated artifact path.</param>
        /// <param name="exported">The prepared save metadata.</param>
        /// <returns>The serializable provenance record.</returns>
        private static FirstRunProvenance BuildProvenance(
            string repositoryRoot,
            string artifactPath,
            ExportedSave exported)
        {
            var catalogHashes = new CatalogHash[CatalogRelativePaths.Length];
            for (int index = 0; index < CatalogRelativePaths.Length; index++)
            {
                string relativePath = CatalogRelativePaths[index];
                string path = ResolveRepositoryPath(repositoryRoot, relativePath);
                catalogHashes[index] = new CatalogHash
                {
                    path = relativePath,
                    sha256 = ComputeCanonicalTextSha256(path)
                };
            }

            return new FirstRunProvenance
            {
                formatVersion = 1,
                artifactPath = ArtifactRelativePath,
                artifactSha256 = ComputeCanonicalTextSha256(artifactPath),
                decodedBinarySha256 = ComputeDecodedBinarySha256(exported.CanonicalText),
                unityVersion = Application.unityVersion,
                unityRevision = ReadUnityRevision(repositoryRoot),
                saveSchema = exported.Schema,
                fixedFirstRunUtc = FixedFirstRunUtc,
                exportMethod = ExportMethod,
                exportCommand =
                    "\"C:\\Program Files\\Unity\\Hub\\Editor\\6000.5.5f1\\Editor\\Unity.exe\" " +
                    "-batchmode -nographics -quit -projectPath \"<repository-root>\" " +
                    $"-executeMethod {ExportMethod} -logFile \"<repository-root>\\Logs\\web-first-run-export.log\"",
                sourceContract =
                    "Oracle.SaveDataSettings defaults -> Oracle.SaveDictionaries/PackSettingsFlags -> " +
                    "SaveSnapshotBuilder -> " +
                    "Oracle.CreateSavePreparationPipeline -> SavePreparationPipeline.PrepareSettings -> IDB1",
                catalogHashes = catalogHashes,
                lifecycleMetadataNormalizationPaths = (string[])LifecycleMetadataPaths.Clone()
            };
        }

        /// <summary>
        /// Resolves the repository root from Unity's Assets directory.
        /// </summary>
        /// <returns>The normalized absolute repository root.</returns>
        private static string GetRepositoryRoot()
        {
            DirectoryInfo assets = new DirectoryInfo(Application.dataPath);
            DirectoryInfo root = assets.Parent;
            return root?.FullName ??
                   throw new InvalidOperationException("Repository root could not be resolved from Application.dataPath.");
        }

        /// <summary>
        /// Converts a slash-separated repository-relative path into an absolute local path.
        /// </summary>
        /// <param name="repositoryRoot">The absolute repository root.</param>
        /// <param name="relativePath">The repository-relative path.</param>
        /// <returns>The absolute platform path.</returns>
        private static string ResolveRepositoryPath(string repositoryRoot, string relativePath)
        {
            return Path.Combine(repositoryRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        }

        /// <summary>
        /// Computes an uppercase SHA-256 digest after canonicalizing text line endings to LF.
        /// </summary>
        /// <param name="path">The absolute file path.</param>
        /// <returns>The uppercase hexadecimal SHA-256 digest of canonical UTF-8 text.</returns>
        private static string ComputeCanonicalTextSha256(string path)
        {
            string canonicalText = File.ReadAllText(path)
                .Replace("\r\n", "\n")
                .Replace("\r", "\n");
            using SHA256 sha256 = SHA256.Create();
            byte[] digest = sha256.ComputeHash(new UTF8Encoding(false).GetBytes(canonicalText));
            return BitConverter.ToString(digest).Replace("-", string.Empty);
        }

        /// <summary>
        /// Computes an uppercase SHA-256 digest for the uncompressed Odin binary inside an IDB1 envelope.
        /// </summary>
        /// <param name="canonicalText">The canonical IDB1 text.</param>
        /// <returns>The uppercase hexadecimal SHA-256 digest.</returns>
        private static string ComputeDecodedBinarySha256(string canonicalText)
        {
            if (!SaveCodec.TryDecodeBinary(canonicalText, out byte[] bytes))
            {
                throw new InvalidOperationException("Generated IDB1 binary could not be decoded for hashing.");
            }

            using SHA256 sha256 = SHA256.Create();
            return BitConverter.ToString(sha256.ComputeHash(bytes)).Replace("-", string.Empty);
        }

        /// <summary>
        /// Reads the full Unity version/revision recorded by the project.
        /// </summary>
        /// <param name="repositoryRoot">The absolute repository root.</param>
        /// <returns>The project Unity revision string.</returns>
        private static string ReadUnityRevision(string repositoryRoot)
        {
            string projectVersionPath = Path.Combine(
                repositoryRoot,
                "ProjectSettings",
                "ProjectVersion.txt");
            foreach (string line in File.ReadAllLines(projectVersionPath))
            {
                const string prefix = "m_EditorVersionWithRevision:";
                if (line.StartsWith(prefix, StringComparison.Ordinal))
                {
                    return line.Substring(prefix.Length).Trim();
                }
            }

            throw new InvalidOperationException(
                "ProjectSettings/ProjectVersion.txt did not contain m_EditorVersionWithRevision.");
        }

        /// <summary>
        /// Holds one production-prepared export in memory.
        /// </summary>
        private sealed class ExportedSave
        {
            /// <summary>
            /// Creates an in-memory exported save record.
            /// </summary>
            /// <param name="canonicalText">The production IDB1 text.</param>
            /// <param name="settings">The prepared settings graph.</param>
            /// <param name="schema">The current production schema.</param>
            public ExportedSave(
                string canonicalText,
                Oracle.SaveDataSettings settings,
                int schema)
            {
                CanonicalText = canonicalText;
                Settings = settings;
                Schema = schema;
            }

            /// <summary>
            /// Gets the canonical uppercase IDB1 text.
            /// </summary>
            public string CanonicalText { get; }

            /// <summary>
            /// Gets the production-prepared save settings.
            /// </summary>
            public Oracle.SaveDataSettings Settings { get; }

            /// <summary>
            /// Gets the current production schema.
            /// </summary>
            public int Schema { get; }
        }

        /// <summary>
        /// Serializes provenance for the checked-in first-run artifact.
        /// </summary>
        [Serializable]
        private sealed class FirstRunProvenance
        {
            public int formatVersion;
            public string artifactPath;
            public string artifactSha256;
            public string decodedBinarySha256;
            public string unityVersion;
            public string unityRevision;
            public int saveSchema;
            public string fixedFirstRunUtc;
            public string exportMethod;
            public string exportCommand;
            public string sourceContract;
            public CatalogHash[] catalogHashes;
            public string[] lifecycleMetadataNormalizationPaths;
        }

        /// <summary>
        /// Serializes one generated Unity catalog hash.
        /// </summary>
        [Serializable]
        private sealed class CatalogHash
        {
            public string path;
            public string sha256;
        }
    }
}
