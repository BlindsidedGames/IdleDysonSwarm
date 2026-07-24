/*
 * Purpose: Loads immutable save-compatibility fixtures and their manifest for EditMode characterization tests.
 * Runs: Unity Editor test assemblies only.
 * Primary entry points: SaveFixtureLoader.LoadManifest, GetFixture, LoadBytes, TryDecode, CreateDeepCopy, and ReadSentinelValue.
 * Owns: Test-only path resolution, fresh byte reads, deep copies, SHA-256 fingerprints, manifest parsing, and decode routing.
 * Delegates: Envelope decoding and Odin deserialization to Systems.Save.SaveCodec.
 *
 * Interacts with:
 * - Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json: fixture metadata and durable sentinel contract.
 * - Assets/Editor/Tests/Save/SaveCodecFixtureCharacterizationTests.cs: only caller.
 * - Systems.Save.SaveCodec: production decoder entry points under characterization.
 *
 * Change notes:
 * - Fixture paths, hashes, format names, schemas, and sentinel paths form an immutable compatibility contract.
 * - Never update fixture bytes or hashes from this loader; intake changes require a separately reviewed fixture copy.
 * - Keep each LoadBytes call independent so one test cannot mutate bytes reused by another test.
 */

using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using Expansion;
using Sirenix.Serialization;
using Systems.Save;
using UnityEngine;

namespace Tests.Save
{
    /// <summary>
    /// Describes the complete immutable save-fixture compatibility manifest.
    /// </summary>
    [Serializable]
    internal sealed class SaveFixtureManifest
    {
        public SaveFixtureDefinition[] fixtures = Array.Empty<SaveFixtureDefinition>();
    }

    /// <summary>
    /// Describes one immutable fixture, its source artifact, and its durable sentinel contract.
    /// </summary>
    [Serializable]
    internal sealed class SaveFixtureDefinition
    {
        public string id;
        public string fixturePath;
        public string sourcePath;
        public int sourceSchema;
        public string sha256;
        public string format;
        public string provenanceDate;
        public SaveFixtureSentinel[] sentinels = Array.Empty<SaveFixtureSentinel>();
    }

    /// <summary>
    /// Describes one durable field value expected after fixture decoding.
    /// </summary>
    [Serializable]
    internal sealed class SaveFixtureSentinel
    {
        public string path;
        public string kind;
        public string value;
    }

    /// <summary>
    /// Loads fixture data without caching mutable bytes and routes decoding through production codec APIs.
    /// </summary>
    internal static class SaveFixtureLoader
    {
        internal const string ManifestPath = "Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json";
        internal const string FixtureDirectoryPath = "Assets/Editor/Tests/Save/Fixtures";
        internal const string OdinJsonFormat = "odin-json";
        internal const string DebugDtoFormat = "debug-dto-binary-gzip-base64";
        internal const string CanonicalIdb1Format = "idb1-binary-gzip-base64";

        /// <summary>
        /// Reads and parses a fresh manifest instance from disk.
        /// </summary>
        /// <returns>The parsed fixture manifest.</returns>
        internal static SaveFixtureManifest LoadManifest()
        {
            string json = File.ReadAllText(ResolveProjectPath(ManifestPath), Encoding.UTF8);
            SaveFixtureManifest manifest = JsonUtility.FromJson<SaveFixtureManifest>(json);
            if (manifest == null || manifest.fixtures == null)
            {
                throw new InvalidDataException($"Fixture manifest '{ManifestPath}' is missing or invalid.");
            }

            return manifest;
        }

        /// <summary>
        /// Finds one fixture by its stable manifest identifier.
        /// </summary>
        /// <param name="manifest">The parsed fixture manifest.</param>
        /// <param name="fixtureId">The stable fixture identifier.</param>
        /// <returns>The matching fixture definition.</returns>
        internal static SaveFixtureDefinition GetFixture(SaveFixtureManifest manifest, string fixtureId)
        {
            if (manifest == null)
            {
                throw new ArgumentNullException(nameof(manifest));
            }

            SaveFixtureDefinition fixture = manifest.fixtures.SingleOrDefault(
                candidate => string.Equals(candidate.id, fixtureId, StringComparison.Ordinal));
            return fixture ?? throw new InvalidDataException($"Fixture '{fixtureId}' is not declared in '{ManifestPath}'.");
        }

        /// <summary>
        /// Reads a new byte array for a fixture without retaining or sharing mutable storage.
        /// </summary>
        /// <param name="fixture">The fixture definition to read.</param>
        /// <returns>A newly allocated byte array containing the exact fixture bytes.</returns>
        internal static byte[] LoadBytes(SaveFixtureDefinition fixture)
        {
            ValidateFixture(fixture);
            return File.ReadAllBytes(ResolveProjectPath(fixture.fixturePath));
        }

        /// <summary>
        /// Reads fixture text using BOM-aware UTF-8 decoding.
        /// </summary>
        /// <param name="fixture">The fixture definition to read.</param>
        /// <returns>The decoded fixture text.</returns>
        internal static string LoadText(SaveFixtureDefinition fixture)
        {
            ValidateFixture(fixture);
            return File.ReadAllText(ResolveProjectPath(fixture.fixturePath), Encoding.UTF8);
        }

        /// <summary>
        /// Decodes a fixture through the production public entry point appropriate to its recorded format.
        /// </summary>
        /// <param name="fixture">The fixture definition to decode.</param>
        /// <param name="settings">The decoded save settings when successful.</param>
        /// <returns><see langword="true"/> when the fixture decodes successfully; otherwise <see langword="false"/>.</returns>
        internal static bool TryDecode(SaveFixtureDefinition fixture, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            string text = LoadText(fixture);

            switch (fixture.format)
            {
                case OdinJsonFormat:
                case DebugDtoFormat:
                    return SaveCodec.TryDecodeSaveSettings(text, out settings);
                case CanonicalIdb1Format:
                    return SaveCodec.TryDecodeBinary(text, out byte[] binary) &&
                           SaveCodec.TryDeserializeSaveSettings(binary, DataFormat.Binary, out settings);
                default:
                    return false;
            }
        }

        /// <summary>
        /// Creates an independent Odin deep copy for migration and normalization characterization.
        /// </summary>
        /// <param name="settings">The decoded source object to copy.</param>
        /// <returns>An independent deep copy of the complete save graph.</returns>
        internal static Oracle.SaveDataSettings CreateDeepCopy(Oracle.SaveDataSettings settings)
        {
            if (settings == null)
            {
                throw new ArgumentNullException(nameof(settings));
            }

            return (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(settings);
        }

        /// <summary>
        /// Computes a deterministic SHA-256 digest of an Odin-binary serialized save graph.
        /// </summary>
        /// <param name="settings">The save graph to serialize and hash.</param>
        /// <returns>The lowercase hexadecimal SHA-256 digest.</returns>
        internal static string ComputeSaveDataSha256(Oracle.SaveDataSettings settings)
        {
            if (settings == null)
            {
                throw new ArgumentNullException(nameof(settings));
            }

            return ComputeSha256(SaveCodec.SerializeSaveSettingsBinary(settings));
        }

        /// <summary>
        /// Computes the lowercase SHA-256 digest for a project-relative file.
        /// </summary>
        /// <param name="relativePath">The path relative to the Unity project root.</param>
        /// <returns>The lowercase hexadecimal SHA-256 digest.</returns>
        internal static string ComputeFileSha256(string relativePath)
        {
            return ComputeSha256(File.ReadAllBytes(ResolveProjectPath(relativePath)));
        }

        /// <summary>
        /// Computes a deterministic fingerprint of every non-meta file in the fixture directory.
        /// </summary>
        /// <returns>A lowercase SHA-256 digest covering fixture filenames and contents.</returns>
        internal static string ComputeFixtureDirectoryFingerprint()
        {
            string fixtureDirectory = ResolveProjectPath(FixtureDirectoryPath);
            string[] files = Directory.GetFiles(fixtureDirectory, "*", SearchOption.TopDirectoryOnly)
                .Where(path => !path.EndsWith(".meta", StringComparison.OrdinalIgnoreCase))
                .OrderBy(path => Path.GetFileName(path), StringComparer.Ordinal)
                .ToArray();

            var fingerprint = new StringBuilder();
            foreach (string file in files)
            {
                fingerprint.Append(Path.GetFileName(file));
                fingerprint.Append('=');
                fingerprint.Append(ComputeSha256(File.ReadAllBytes(file)));
                fingerprint.Append('\n');
            }

            return ComputeSha256(Encoding.UTF8.GetBytes(fingerprint.ToString()));
        }

        /// <summary>
        /// Reads a nested public or private field using a dot-separated sentinel path.
        /// </summary>
        /// <param name="settings">The decoded save settings root.</param>
        /// <param name="fieldPath">The dot-separated field path.</param>
        /// <returns>The resolved field value.</returns>
        internal static object ReadSentinelValue(Oracle.SaveDataSettings settings, string fieldPath)
        {
            if (settings == null)
            {
                throw new ArgumentNullException(nameof(settings));
            }

            if (string.IsNullOrWhiteSpace(fieldPath))
            {
                throw new ArgumentException("Sentinel field path is required.", nameof(fieldPath));
            }

            object current = settings;
            foreach (string segment in fieldPath.Split('.'))
            {
                if (current == null)
                {
                    throw new InvalidDataException($"Sentinel path '{fieldPath}' reached null before '{segment}'.");
                }

                FieldInfo field = current.GetType().GetField(
                    segment,
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (field == null)
                {
                    throw new MissingFieldException(current.GetType().FullName, segment);
                }

                current = field.GetValue(current);
            }

            return current;
        }

        /// <summary>
        /// Parses an invariant double recorded as manifest text.
        /// </summary>
        /// <param name="value">The manifest value.</param>
        /// <returns>The parsed double value.</returns>
        internal static double ParseDouble(string value)
        {
            return double.Parse(value, NumberStyles.Float, CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Resolves a project-relative path beneath the current Unity project root.
        /// </summary>
        /// <param name="relativePath">The project-relative path.</param>
        /// <returns>The full filesystem path.</returns>
        internal static string ResolveProjectPath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                throw new ArgumentException("Project-relative path is required.", nameof(relativePath));
            }

            string projectRoot = Path.GetDirectoryName(Application.dataPath);
            return Path.GetFullPath(Path.Combine(projectRoot ?? Directory.GetCurrentDirectory(), relativePath));
        }

        /// <summary>
        /// Computes the lowercase SHA-256 digest for a byte sequence.
        /// </summary>
        /// <param name="bytes">The bytes to hash.</param>
        /// <returns>The lowercase hexadecimal SHA-256 digest.</returns>
        private static string ComputeSha256(byte[] bytes)
        {
            using SHA256 sha256 = SHA256.Create();
            byte[] digest = sha256.ComputeHash(bytes ?? Array.Empty<byte>());
            var text = new StringBuilder(digest.Length * 2);
            foreach (byte value in digest)
            {
                text.Append(value.ToString("x2", CultureInfo.InvariantCulture));
            }

            return text.ToString();
        }

        /// <summary>
        /// Ensures a fixture definition has the paths required for a read.
        /// </summary>
        /// <param name="fixture">The fixture definition to validate.</param>
        private static void ValidateFixture(SaveFixtureDefinition fixture)
        {
            if (fixture == null)
            {
                throw new ArgumentNullException(nameof(fixture));
            }

            if (string.IsNullOrWhiteSpace(fixture.fixturePath))
            {
                throw new InvalidDataException($"Fixture '{fixture.id}' has no fixture path.");
            }
        }
    }
}
