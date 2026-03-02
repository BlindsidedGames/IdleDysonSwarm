using System;
using System.Collections.Generic;
using GameData;

namespace Systems.Skills
{
    /// <summary>
    /// Builds dependency-safe ordering for skill auto-assignment queues.
    /// </summary>
    /// <remarks>
    /// Purpose:
    /// - Normalize queued skill ids so prerequisites and shadow requirements are placed before dependents.
    /// - Remove duplicates and conflicting exclusives to avoid avoidable queue stalls.
    ///
    /// Where it runs:
    /// - Runtime and migration contexts.
    ///
    /// Primary entry points:
    /// - <see cref="BuildDependencySafeOrder"/>.
    ///
    /// Interacts with:
    /// - Reads skill definitions from <see cref="GameDataRegistry"/> and <see cref="SkillDatabase"/>.
    /// - Used by Oracle migration/import/save queue write paths.
    ///
    /// Change notes:
    /// - Reordering semantics affect preset import/export behavior and runtime auto-assignment results.
    /// - Exclusive filtering intentionally keeps the first accepted skill and drops later conflicting entries.
    /// </remarks>
    public static class SkillAutoAssignOrderUtility
    {
        /// <summary>
        /// Returns a de-duplicated, dependency-safe auto-assign queue order.
        /// </summary>
        /// <param name="ids">Input skill ids.</param>
        /// <returns>Ordered ids suitable for auto-assignment.</returns>
        public static List<string> BuildDependencySafeOrder(List<string> ids)
        {
            if (ids == null || ids.Count <= 1) return ids ?? new List<string>();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null) return ids;

            var orderedInput = new List<string>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (string id in ids)
            {
                if (string.IsNullOrEmpty(id) || !seen.Add(id)) continue;
                orderedInput.Add(id);
            }

            if (orderedInput.Count <= 1) return orderedInput;

            var selected = new HashSet<string>(orderedInput, StringComparer.Ordinal);
            var indegree = new Dictionary<string, int>(orderedInput.Count, StringComparer.Ordinal);
            var adjacency = new Dictionary<string, List<string>>(orderedInput.Count, StringComparer.Ordinal);

            foreach (string id in orderedInput)
            {
                indegree[id] = 0;
                adjacency[id] = new List<string>();
            }

            foreach (string id in orderedInput)
            {
                if (!registry.skillDatabase.TryGet(id, out SkillDefinition definition) || definition == null) continue;
                AppendDependencies(id, definition.requiredSkillIds, selected, indegree, adjacency);
                AppendDependencies(id, definition.shadowRequirementIds, selected, indegree, adjacency);
            }

            var remaining = new HashSet<string>(orderedInput, StringComparer.Ordinal);
            var topo = new List<string>(orderedInput.Count);

            while (remaining.Count > 0)
            {
                bool progressed = false;
                for (int i = 0; i < orderedInput.Count; i++)
                {
                    string id = orderedInput[i];
                    if (!remaining.Contains(id)) continue;
                    if (indegree[id] != 0) continue;

                    remaining.Remove(id);
                    topo.Add(id);
                    foreach (string neighbor in adjacency[id])
                    {
                        indegree[neighbor]--;
                    }

                    progressed = true;
                }

                if (progressed) continue;

                // Cycle or external prereq dependencies: preserve original relative order for unresolved items.
                foreach (string id in orderedInput)
                {
                    if (!remaining.Contains(id)) continue;
                    topo.Add(id);
                }

                break;
            }

            // Keep the first accepted entry for any exclusive family; drop later conflicts.
            var accepted = new List<string>(topo.Count);
            var acceptedSet = new HashSet<string>(StringComparer.Ordinal);
            foreach (string id in topo)
            {
                if (!registry.skillDatabase.TryGet(id, out SkillDefinition definition) || definition == null)
                {
                    accepted.Add(id);
                    acceptedSet.Add(id);
                    continue;
                }

                if (definition.exclusiveWithIds != null && definition.exclusiveWithIds.Length > 0)
                {
                    bool blocked = false;
                    foreach (string exclusiveId in definition.exclusiveWithIds)
                    {
                        if (!acceptedSet.Contains(exclusiveId)) continue;
                        blocked = true;
                        break;
                    }

                    if (blocked) continue;
                }

                accepted.Add(id);
                acceptedSet.Add(id);
            }

            return accepted;
        }

        /// <summary>
        /// Adds prerequisite edges to the graph for topological ordering.
        /// </summary>
        /// <param name="id">Dependent skill id.</param>
        /// <param name="requirements">Required ids for the dependent skill.</param>
        /// <param name="selected">Selected ids in the queue.</param>
        /// <param name="indegree">In-degree map for topo sort.</param>
        /// <param name="adjacency">Adjacency map for topo sort.</param>
        private static void AppendDependencies(
            string id,
            string[] requirements,
            HashSet<string> selected,
            Dictionary<string, int> indegree,
            Dictionary<string, List<string>> adjacency)
        {
            if (requirements == null || requirements.Length == 0) return;
            foreach (string req in requirements)
            {
                if (string.IsNullOrEmpty(req)) continue;
                if (!selected.Contains(req)) continue;
                adjacency[req].Add(id);
                indegree[id] += 1;
            }
        }
    }
}
