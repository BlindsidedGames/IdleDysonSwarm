using System;
using System.Collections.Generic;
using Expansion;
using GameData;
using TMPro;
using UnityEngine;
using static Expansion.Oracle;

[DefaultExecutionOrder(200)]
public class SkillTreeSearchController : MonoBehaviour
{
    [SerializeField] private TMP_InputField searchInput;

    private readonly List<SearchEntry> _entries = new List<SearchEntry>(128);
    private string _lastQuery;
    private Coroutine _deferredBuild;

    private void OnEnable()
    {
        Oracle.UpdateSkills += HandleUpdateSkills;
        BuildIndex();
        if (searchInput != null)
        {
            searchInput.onValueChanged.AddListener(OnSearchChanged);
            OnSearchChanged(searchInput.text);
        }
        else
        {
            Debug.LogWarning("[SkillTreeSearchController] No search input assigned.");
        }
    }

    private void OnDisable()
    {
        Oracle.UpdateSkills -= HandleUpdateSkills;
        if (searchInput != null) searchInput.onValueChanged.RemoveListener(OnSearchChanged);

        ClearHighlights();
        if (_deferredBuild != null)
        {
            StopCoroutine(_deferredBuild);
            _deferredBuild = null;
        }
    }

    public void BuildIndex()
    {
        _entries.Clear();
        if (oracle == null || oracle.allSkillTreeManagers == null) return;

        foreach (SkillTreeManager manager in oracle.allSkillTreeManagers)
        {
            if (manager == null) continue;
            SkillDefinition definition = manager.Definition;
            string id = manager.SkillId ?? string.Empty;
            int legacyKey = manager.skillKey;
            if (legacyKey <= 0 && !string.IsNullOrEmpty(id) && SkillIdMap.TryGetLegacyKey(id, out int mappedKey))
            {
                legacyKey = mappedKey;
            }
            string displayName = definition != null ? definition.displayName : string.Empty;
            string description = definition != null ? definition.description : string.Empty;
            string technical = definition != null ? definition.technicalDescription : string.Empty;

            string searchable = BuildSearchableText(id, legacyKey, displayName, description, technical);
            if (string.IsNullOrEmpty(searchable)) continue;

            _entries.Add(new SearchEntry
            {
                manager = manager,
                id = id,
                displayName = displayName,
                searchable = searchable
            });
        }

        if (_entries.Count == 0 && _deferredBuild == null)
        {
            _deferredBuild = StartCoroutine(DeferredBuild());
        }
    }

    private void OnSearchChanged(string rawQuery)
    {
        string query = Normalize(rawQuery);
        if (string.Equals(query, _lastQuery, StringComparison.Ordinal))
        {
            return;
        }

        _lastQuery = query;
        if (string.IsNullOrEmpty(query))
        {
            ClearHighlights();
            return;
        }

        string[] tokens = SplitTokens(query);
        for (int i = 0; i < _entries.Count; i++)
        {
            SearchEntry entry = _entries[i];
            int score = ScoreEntry(tokens, query, entry);
            entry.manager.SetSearchHighlight(score > 0);
        }
    }

    private void ClearHighlights()
    {
        for (int i = 0; i < _entries.Count; i++)
        {
            _entries[i].manager.SetSearchHighlight(false);
        }
    }

    private static string BuildSearchableText(string id, int legacyKey, string displayName, string description, string technical)
    {
        string legacy = legacyKey > 0 ? legacyKey.ToString() : string.Empty;
        string combined = $"{id} {legacy} {displayName} {description} {technical}";
        return Normalize(combined);
    }

    private static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        int len = input.Length;
        char[] buffer = new char[len];
        int count = 0;
        bool lastWasSpace = true;

        for (int i = 0; i < len; i++)
        {
            char c = input[i];
            if (char.IsLetterOrDigit(c))
            {
                buffer[count++] = char.ToLowerInvariant(c);
                lastWasSpace = false;
            }
            else if (!lastWasSpace)
            {
                buffer[count++] = ' ';
                lastWasSpace = true;
            }
        }

        if (count == 0) return string.Empty;
        if (buffer[count - 1] == ' ') count--;
        return new string(buffer, 0, count);
    }

    private static string[] SplitTokens(string query)
    {
        return query.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
    }

    private static int ScoreEntry(string[] tokens, string query, SearchEntry entry)
    {
        if (tokens.Length == 0) return 0;
        string text = entry.searchable;
        int score = 0;

        for (int i = 0; i < tokens.Length; i++)
        {
            string token = tokens[i];
            if (text.Contains(token))
            {
                score += 10;
                if (StartsWithWord(text, token)) score += 5;
            }
            else
            {
                return 0;
            }
        }

        if (!string.IsNullOrEmpty(entry.displayName) && StartsWithWord(Normalize(entry.displayName), query))
        {
            score += 20;
        }

        if (!string.IsNullOrEmpty(entry.id) && StartsWithWord(Normalize(entry.id), query))
        {
            score += 15;
        }

        return score;
    }

    private static bool StartsWithWord(string text, string token)
    {
        if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(token)) return false;
        if (text.StartsWith(token, StringComparison.Ordinal)) return true;
        return text.Contains(" " + token, StringComparison.Ordinal);
    }

    private void HandleUpdateSkills()
    {
        RebuildAndSearch();
    }

    private void RebuildAndSearch()
    {
        _lastQuery = null;
        BuildIndex();
        if (searchInput != null)
        {
            OnSearchChanged(searchInput.text);
        }
    }

    private System.Collections.IEnumerator DeferredBuild()
    {
        const int maxFrames = 30;
        for (int i = 0; i < maxFrames; i++)
        {
            yield return null;
            if (oracle != null && oracle.allSkillTreeManagers != null && oracle.allSkillTreeManagers.Count > 0)
            {
                _deferredBuild = null;
                RebuildAndSearch();
                yield break;
            }
        }

        _deferredBuild = null;
    }

    private sealed class SearchEntry
    {
        public SkillTreeManager manager;
        public string id;
        public string displayName;
        public string searchable;
    }
}
