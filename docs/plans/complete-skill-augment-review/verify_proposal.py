"""Audit proposal metadata and relaxed coefficient bounds; no gameplay simulation.

Run from any working directory with Python 3.10+ (standard library only).
Default: one JSON report on stdout. --output PATH writes that report explicitly.
Source catalogs are never modified. Bounds omit runtime eligibility/donor costs.
"""
from pathlib import Path
import argparse, collections, hashlib, json, math

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, help='Write JSON to this path instead of stdout.')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[3]
catalog_path = repo / 'docs/plans/complete-skill-augment-catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
parents = catalog['parents']
nodes = {a['id']: a for p in parents for a in p['augments']}
issues = []
menus = []
closure_cache = {}

def closure(node_id, active=()):
    if node_id in active:
        raise ValueError('cycle: ' + str(active + (node_id,)))
    if node_id not in closure_cache:
        a = nodes[node_id]
        result = {node_id}
        for dependency in a['requiredAugmentIds']:
            result.update(closure(dependency, active + (node_id,)))
        closure_cache[node_id] = result
    return closure_cache[node_id]

for p in parents:
    aa = p['augments']
    local_ids = {a['id'] for a in aa}
    for a in aa:
        own_closure = closure(a['id'])
        cost = sum(nodes[i]['cost'] for i in own_closure)
        if cost != a['entryCost']:
            issues.append([a['name'], 'entryCost', cost, a['entryCost']])
        if not own_closure <= local_ids:
            issues.append([a['name'], 'cross-parent prerequisite'])
        if set(a['prerequisiteClosure']) != own_closure - {a['id']}:
            issues.append([a['name'], 'closure mismatch'])
    options = []
    for mask in range(1 << len(aa)):
        selected = [a for i, a in enumerate(aa) if mask & (1 << i)]
        ids = {a['id'] for a in selected}
        if all(set(a['requiredAugmentIds']) <= ids for a in selected):
            options.append((sum(a['cost'] for a in selected), selected))
    menus.append(options)

def optimize(channel, phase='before', incremental_toolkit=False, with_witness=False, parent_limit=16):
    # state -> (score, ordered selected IDs). Parent limit is a relaxed Catalyst constraint.
    dp = {(0, 0): (0.0, ())}
    for options in menus:
        new_dp = {}
        scored = []
        for cost, selected in options:
            value = len(selected) if channel == 'nodeCount' else sum(
                a['balanceBounds']['phases'][phase].get(channel, 0) for a in selected)
            if incremental_toolkit and channel in ('bots','lineFlow','managerFlow','serverFlow','dataCenterFlow') and any(a['name']=='Universal Toolkit' for a in selected):
                value -= 1
            ids = tuple(a['id'] for a in selected) if with_witness else ()
            scored.append((cost, int(bool(selected)), value, ids))
        for (spent, used), (score, chosen) in dp.items():
            for cost, used_add, value, ids in scored:
                key = spent + cost, used + used_add
                if key[0] > 42 or key[1] > parent_limit:
                    continue
                new_score = score + value
                if new_score > new_dp.get(key, (-1, ()))[0]:
                    new_dp[key] = new_score, chosen + ids
        dp = new_dp
    (spent, used), (score, chosen) = max(dp.items(), key=lambda pair: pair[1][0])
    return dict(allowance=score, spent=spent, parents=used, selected=list(chosen))

runtime_path = repo/'src/game-data/generated/runtime-catalog.json'
runtime = json.loads(runtime_path.read_text(encoding='utf-8'))
skills = [a for a in runtime['assets'] if a['kind']=='GameData.SkillDefinition']
native_augmented = {'manualLabour','megaSwarm','productionScaling','startHereTree','superRadiantScattering','superSwarm','ultimateSwarm'}
coverage = {a['id'] for a in skills} - native_augmented
source_coefficients = [1/10,1/60,1/600,1/900,1/3600,1/7200,1/14400,1/28800]
lam = math.log(2)/300
secret_adjustment = 7*42*3*5/3/8
prefactor = math.prod(source_coefficients)*secret_adjustment/lam**8
essence = lambda s: 1+.42*s + ((255-.42*42)/(42*41))*s*(s-1)
channels = ['nodeCount','bots','lineFlow','managerFlow','serverFlow','dataCenterFlow','planetFlow','matrioshkaFlow','birchFlow','cash','science','education','panels','panelLifetime']
frontiers = {channel: optimize(channel, with_witness=True) for channel in channels}
incremental_frontiers = {channel: optimize(channel, incremental_toolkit=True) for channel in channels[1:6]}
reachable_frontiers = {channel: optimize(channel, incremental_toolkit=True, parent_limit=15, with_witness=True) for channel in channels}
fragment_menus = [options for p, options in zip(parents,menus) if next(a for a in skills if a['id']==p['parentId'])['data'].get('isFragment')]
all_menus = menus
menus = fragment_menus
fragment = optimize('nodeCount', with_witness=True)
menus = all_menus
out = {
    'reviewed_proposal_commit':'8f072ae12e0f4513c362106eaff98e6dac4c9106',
    'input_hash_normalization':'CRLF converted to LF for cross-platform source identity',
    'runtime_catalog_sha256':hashlib.sha256(runtime_path.read_bytes().replace(b'\r\n',b'\n')).hexdigest(),
    'budget_assumptions':dict(skill_points=42,total_challenge_catalysts=16,mandatory_manual_labour_catalysts=1,new_parent_limit=15,manual_labour_in_new_catalog=any(p['parentId']=='manualLabour' for p in parents)),
    'catalog_sha256':hashlib.sha256(catalog_path.read_bytes().replace(b'\r\n',b'\n')).hexdigest(),
    'inventory':dict(base_skills=len(skills),parents=len(parents),new_nodes=len(nodes),duplicate_ids=sum(len(p['augments']) for p in parents)-len(nodes),duplicate_names=[n for n,c in collections.Counter(a['name'] for a in nodes.values()).items() if c>1],coverage_missing=sorted(coverage-{p['parentId'] for p in parents}),coverage_extra=sorted({p['parentId'] for p in parents}-coverage),total_node_cost=sum(a['cost'] for a in nodes.values()),local_closed_subsets=sum(len(o) for o in menus),maximum_entry_cost=max(a['entryCost'] for a in nodes.values()),discovery_text_variants=sum(a['technical']!=a['technicalDiscovery'] for a in nodes.values())),
    'metadata_issues':issues,
    'frontiers_from_declared_annotations':frontiers,
    'frontiers_correcting_toolkit_increment':incremental_frontiers,
    'frontiers_reserving_mandatory_manual_labour_fracture':reachable_frontiers,
    'fragment_parents_42sp_maximum_node_count':fragment,
    'formula_observations':dict(lambda_per_game_second=lam,isolated_chain_prefactor=prefactor,isolated_chain_double_time_base_hours=math.log(4e242/prefactor)/(2*lam)/3600,ordinary_link_cartesian_product=math.prod(1+frontiers[c]['allowance'] for c in channels[1:9]),purity_essence_42=essence(42),purity_essence_31=essence(31),purity_essence_31_five_link_ratio=(essence(31)/essence(42))**5,purity_clear_horizon_39_five_link_times_three_mega_ratio=(essence(39)/essence(42))**5*2**3,convergence_doublings_in_24base_hours_with_double_time=24*3600*2/300,convergence_brains_from_one_in_24base_hours_with_double_time=2**(24*3600*2/300),liquid_assets_discount_at_cash_1e20=.001*20,liquid_assets_discount_at_cash_1e40=.001*40,steady_chain_time_saved_by_2x_one_link_base_minutes=math.log(2)/(2*lam)/60),
    'limits':'No canonical-engine runs performed. These are annotation-based optimistic bounds, not reachable gameplay loadouts. They relax eligibility, omit native donor and existing augment costs and exclude non-rate units. Reserving Manual Labour corrects only the new-parent Catalyst limit. Per-channel optima are independent; their Cartesian product is not a simultaneous loadout. This is not an interaction safety proof.'
}
report = json.dumps(out, indent=2) + '\n'
if args.output is None:
    print(report, end='')
else:
    args.output.write_text(report, encoding='utf-8')
