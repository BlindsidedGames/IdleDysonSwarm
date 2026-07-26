/*
 * Purpose: Finds and applies Dream quiet intervals between material fixed-tick events.
 * Runs: Offline fast-forward only; event ticks remain on the canonical scheduler.
 */

using System;
using Systems.Numeric;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public readonly struct DreamOfflineTiming
    {
        public DreamOfflineTiming(
            double hunter,
            double gatherer,
            double community,
            double housing,
            double villages,
            double workers,
            double cities,
            double factories,
            double bots,
            double spaceFactories,
            bool railgunFiring)
        {
            Hunter = hunter;
            Gatherer = gatherer;
            Community = community;
            Housing = housing;
            Villages = villages;
            Workers = workers;
            Cities = cities;
            Factories = factories;
            Bots = bots;
            SpaceFactories = spaceFactories;
            RailgunFiring = railgunFiring;
        }

        public double Hunter { get; }
        public double Gatherer { get; }
        public double Community { get; }
        public double Housing { get; }
        public double Villages { get; }
        public double Workers { get; }
        public double Cities { get; }
        public double Factories { get; }
        public double Bots { get; }
        public double SpaceFactories { get; }
        public bool RailgunFiring { get; }
    }

    public static class DreamAnalyticalOfflineSimulation
    {
        private const double TickSeconds = 0.1d;
        private const double TickEpsilon = TickSeconds * 1e-9d;

        public static bool IsClockIdle(
            SaveDataDream1 dream,
            bool railgunFiring)
        {
            if (dream == null) return true;
            return !railgunFiring &&
                   dream.communityBoostTime <= 0d &&
                   dream.factoriesBoostTime <= 0d &&
                   dream.railgunFireProgress <= 0d &&
                   dream.hunters == 0L &&
                   dream.gatherers == 0L &&
                   dream.community == 0d &&
                   dream.housing == 0d &&
                   dream.villages == 0d &&
                   dream.workers == 0d &&
                   dream.cities == 0d &&
                   dream.factories == 0d &&
                   dream.bots == 0d &&
                   dream.rockets == 0d &&
                   dream.energy == 0d &&
                   dream.spaceFactories == 0d &&
                   dream.dysonPanels == 0L &&
                   dream.railgunCharge == 0d &&
                   dream.solarPanels == 0d &&
                   dream.fusion == 0d &&
                   dream.swarmPanels == 0L &&
                   !dream.engineering &&
                   !dream.shipping &&
                   !dream.worldTrade &&
                   !dream.worldPeace &&
                   !dream.mathematics &&
                   !dream.advancedPhysics;
        }
        private const double HousingConversionCost = 10d;
        private const double VillageConversionCost = 25d;

        public static long GetQuietTickHorizon(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            long requestedTicks)
        {
            if (dream == null || prestige == null || requestedTicks < 2L ||
                !TimingIsValid(timing) || HasImmediateEvent(dream, prestige, timing))
            {
                return 0L;
            }

            DreamDoubleTimeTick doubleTime = DreamDoubleTimeMath.Prepare(
                prestige.doubleTimeOwned,
                prestige.doubleTime,
                prestige.doubleTimeRate,
                TickSeconds);
            int safeRate = Math.Max(0, Math.Min(10, prestige.doubleTimeRate));
            double fullConsumption = safeRate * TickSeconds;
            if (doubleTime.Active && safeRate > 0 &&
                doubleTime.BankConsumed + TickEpsilon < fullConsumption)
            {
                return 0L;
            }

            long horizon = requestedTicks;
            if (doubleTime.Active && safeRate > 0)
            {
                long fullTicks = FloorToLong(
                    NumericSafety.ClampContinuous(prestige.doubleTime) / fullConsumption);
                if (fullTicks <= 0L) return 0L;
                horizon = Math.Min(horizon, fullTicks);
            }

            double globalMultiplier = doubleTime.EffectiveMultiplier;
            LimitBeforeTimerEvent(
                ref horizon,
                dream.hunterTimerProgress,
                timing.Hunter,
                TimerIncrement(dream.hunters, globalMultiplier));
            LimitBeforeTimerEvent(
                ref horizon,
                dream.gathererTimerProgress,
                timing.Gatherer,
                TimerIncrement(dream.gatherers, globalMultiplier));

            double communityMultiplier =
                dream.communityBoostTime > 0d ? globalMultiplier * 2d : globalMultiplier;
            LimitBeforeTimerEvent(
                ref horizon,
                dream.communityTimerProgress,
                timing.Community,
                TimerIncrement(dream.community, communityMultiplier));
            LimitBeforeTimerEvent(
                ref horizon,
                dream.housingTimerProgress,
                timing.Housing,
                TimerIncrement(dream.housing, globalMultiplier));
            LimitBeforeTimerEvent(
                ref horizon,
                dream.villagesTimerProgress,
                timing.Villages,
                TimerIncrement(dream.villages, globalMultiplier));

            double workerMultiplier = globalMultiplier;
            if (prestige.workerBoostAcivator && dream.workers > 0d)
                workerMultiplier *= 1d + Math.Log10(dream.workers);
            LimitBeforeTimerEvent(
                ref horizon,
                dream.workersTimerProgress,
                timing.Workers,
                TimerIncrement(dream.workers, workerMultiplier));
            LimitBeforeTimerEvent(
                ref horizon,
                dream.citiesTimerProgress,
                timing.Cities,
                TimerIncrement(dream.cities, globalMultiplier));

            double factoryMultiplier = globalMultiplier;
            if (dream.factoriesBoostTime > 0d) factoryMultiplier *= 2d;
            if (dream.shippingComplete) factoryMultiplier *= 2d;
            if (dream.worldTradeComplete) factoryMultiplier *= 2d;
            LimitBeforeTimerEvent(
                ref horizon,
                dream.factoriesTimerProgress,
                timing.Factories,
                TimerIncrement(dream.factories, factoryMultiplier));

            double botBaseMultiplier = 0d;
            if (dream.bots >= 1d)
            {
                botBaseMultiplier = 1d + Math.Log10(dream.bots);
                if (dream.bots < 100d) botBaseMultiplier *= dream.bots / 100d;
            }
            double botMultiplier = globalMultiplier;
            if (dream.worldPeaceComplete) botMultiplier *= 2d;
            if (prestige.botsBoost1Activator) botMultiplier *= 2d;
            LimitBeforeTimerEvent(
                ref horizon,
                dream.botsTimerProgress,
                timing.Bots,
                botBaseMultiplier * botMultiplier * TickSeconds);

            double spaceFactoryMultiplier = globalMultiplier;
            if (prestige.sfActivator1) spaceFactoryMultiplier *= 2d;
            if (prestige.sfActivator2) spaceFactoryMultiplier *= 2d;
            if (prestige.sfActivator3) spaceFactoryMultiplier *= 2d;
            if (dream.dysonPanels < IdleDysonSwarm.Systems.Constants.Dream1Constants.DysonPanelCap)
            {
                LimitBeforeTimerEvent(
                    ref horizon,
                    dream.spaceFactoriesTimerProgress,
                    timing.SpaceFactories,
                    TimerIncrement(dream.spaceFactories, spaceFactoryMultiplier));
            }

            LimitBeforeResearchCompletion(
                ref horizon,
                dream.engineering,
                dream.engineeringComplete,
                dream.engineeringProgress,
                dream.engineeringResearchTime,
                globalMultiplier);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.shipping,
                dream.shippingComplete,
                dream.shippingProgress,
                dream.shippingResearchTime,
                globalMultiplier);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.worldTrade,
                dream.worldTradeComplete,
                dream.worldTradeProgress,
                dream.worldTradeResearchTime,
                globalMultiplier);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.worldPeace,
                dream.worldPeaceComplete,
                dream.worldPeaceProgress,
                dream.worldPeaceResearchTime,
                globalMultiplier);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.mathematics,
                dream.mathematicsComplete,
                dream.mathematicsProgress,
                dream.mathematicsResearchTime,
                globalMultiplier);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.advancedPhysics,
                dream.advancedPhysicsComplete,
                dream.advancedPhysicsProgress,
                dream.advancedPhysicsResearchTime,
                globalMultiplier);

            LimitAtBoostExpiry(ref horizon, dream.communityBoostTime);
            LimitAtBoostExpiry(ref horizon, dream.factoriesBoostTime);
            LimitAtRailgunBoundary(ref horizon, dream, prestige, globalMultiplier);
            return Math.Max(0L, horizon);
        }

        public static bool AdvanceQuietTicks(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            long ticks)
        {
            long allowed = GetQuietTickHorizon(dream, prestige, timing, ticks);
            if (allowed != ticks || ticks <= 0L) return false;
            AdvanceValidatedQuietTicks(dream, prestige, timing, ticks);
            return true;
        }

        public static void AdvanceValidatedQuietTicks(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            long ticks)
        {
            DreamDoubleTimeTick doubleTime = DreamDoubleTimeMath.Prepare(
                prestige.doubleTimeOwned,
                prestige.doubleTime,
                prestige.doubleTimeRate,
                TickSeconds);
            double globalMultiplier = doubleTime.EffectiveMultiplier;

            AdvanceTimer(
                ref dream.hunterTimerProgress,
                TimerIncrement(dream.hunters, globalMultiplier),
                ticks);
            AdvanceTimer(
                ref dream.gathererTimerProgress,
                TimerIncrement(dream.gatherers, globalMultiplier),
                ticks);
            AdvanceTimer(
                ref dream.communityTimerProgress,
                TimerIncrement(
                    dream.community,
                    dream.communityBoostTime > 0d
                        ? globalMultiplier * 2d
                        : globalMultiplier),
                ticks);
            AdvanceTimer(
                ref dream.housingTimerProgress,
                TimerIncrement(dream.housing, globalMultiplier),
                ticks);
            AdvanceTimer(
                ref dream.villagesTimerProgress,
                TimerIncrement(dream.villages, globalMultiplier),
                ticks);

            double workerMultiplier = globalMultiplier;
            if (prestige.workerBoostAcivator && dream.workers > 0d)
                workerMultiplier *= 1d + Math.Log10(dream.workers);
            AdvanceTimer(
                ref dream.workersTimerProgress,
                TimerIncrement(dream.workers, workerMultiplier),
                ticks);
            AdvanceTimer(
                ref dream.citiesTimerProgress,
                TimerIncrement(dream.cities, globalMultiplier),
                ticks);

            double factoryMultiplier = globalMultiplier;
            if (dream.factoriesBoostTime > 0d) factoryMultiplier *= 2d;
            if (dream.shippingComplete) factoryMultiplier *= 2d;
            if (dream.worldTradeComplete) factoryMultiplier *= 2d;
            AdvanceTimer(
                ref dream.factoriesTimerProgress,
                TimerIncrement(dream.factories, factoryMultiplier),
                ticks);

            double botBaseMultiplier = 0d;
            if (dream.bots >= 1d)
            {
                botBaseMultiplier = 1d + Math.Log10(dream.bots);
                if (dream.bots < 100d) botBaseMultiplier *= dream.bots / 100d;
            }
            double botMultiplier = globalMultiplier;
            if (dream.worldPeaceComplete) botMultiplier *= 2d;
            if (prestige.botsBoost1Activator) botMultiplier *= 2d;
            AdvanceTimer(
                ref dream.botsTimerProgress,
                botBaseMultiplier * botMultiplier * TickSeconds,
                ticks);

            double spaceFactoryMultiplier = globalMultiplier;
            if (prestige.sfActivator1) spaceFactoryMultiplier *= 2d;
            if (prestige.sfActivator2) spaceFactoryMultiplier *= 2d;
            if (prestige.sfActivator3) spaceFactoryMultiplier *= 2d;
            if (dream.dysonPanels < IdleDysonSwarm.Systems.Constants.Dream1Constants.DysonPanelCap)
            {
                AdvanceTimer(
                    ref dream.spaceFactoriesTimerProgress,
                    TimerIncrement(dream.spaceFactories, spaceFactoryMultiplier),
                    ticks);
            }

            AdvanceResearch(
                ref dream.engineeringProgress,
                dream.engineering && !dream.engineeringComplete,
                globalMultiplier,
                ticks);
            AdvanceResearch(
                ref dream.shippingProgress,
                dream.shipping && !dream.shippingComplete,
                globalMultiplier,
                ticks);
            AdvanceResearch(
                ref dream.worldTradeProgress,
                dream.worldTrade && !dream.worldTradeComplete,
                globalMultiplier,
                ticks);
            AdvanceResearch(
                ref dream.worldPeaceProgress,
                dream.worldPeace && !dream.worldPeaceComplete,
                globalMultiplier,
                ticks);
            AdvanceResearch(
                ref dream.mathematicsProgress,
                dream.mathematics && !dream.mathematicsComplete,
                globalMultiplier,
                ticks);
            AdvanceResearch(
                ref dream.advancedPhysicsProgress,
                dream.advancedPhysics && !dream.advancedPhysicsComplete,
                globalMultiplier,
                ticks);

            double elapsed = NumericSafety.Multiply(ticks, TickSeconds).Value;
            dream.communityBoostTime = Math.Max(0d, dream.communityBoostTime - elapsed);
            dream.factoriesBoostTime = Math.Max(0d, dream.factoriesBoostTime - elapsed);
            AdvanceEnergyAndRailgun(dream, prestige, globalMultiplier, ticks);

            prestige.doubleTime = DreamDoubleTimeMath.RemainingBankAfterTicks(
                prestige.doubleTimeOwned,
                prestige.doubleTime,
                prestige.doubleTimeRate,
                ticks,
                TickSeconds);
            prestige.doDoubleTime =
                prestige.doubleTimeOwned && prestige.doubleTime > 0d;
        }

        private static bool HasImmediateEvent(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing)
        {
            if (dream.housing >= HousingConversionCost ||
                dream.villages >= VillageConversionCost)
                return true;
            if (dream.rocketsPerSpaceFactory <= 0L) return true;
            if (Math.Min(
                    Math.Floor(dream.rockets / dream.rocketsPerSpaceFactory),
                    Math.Floor(dream.factories)) > 0d)
                return true;
            if (timing.RailgunFiring || dream.railgunFireProgress > 0d)
                return true;

            DreamDoubleTimeTick doubleTime = DreamDoubleTimeMath.Prepare(
                prestige.doubleTimeOwned,
                prestige.doubleTime,
                prestige.doubleTimeRate,
                TickSeconds);
            int panelsRequired = doubleTime.Active && prestige.doubleTimeRate >= 1
                ? Math.Min(10, prestige.doubleTimeRate)
                : 1;
            if (dream.railgunCharge >= dream.railgunMaxCharge &&
                dream.dysonPanels >= panelsRequired)
                return true;

            return prestige.disasterStage switch
            {
                0 or 1 => dream.cities >= 1d,
                2 => dream.bots >= 100d,
                3 => dream.spaceFactories >= 5d,
                _ => false
            };
        }

        private static void LimitAtRailgunBoundary(
            ref long horizon,
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            double globalMultiplier)
        {
            double energyPerTick =
                SpaceAgeManager.CalculateEnergyDelta(dream, globalMultiplier);
            if (energyPerTick <= 0d) return;
            if (dream.railgunCharge >= dream.railgunMaxCharge) return;
            double remaining = Math.Max(
                0d,
                dream.railgunMaxCharge -
                NumericSafety.Add(dream.railgunCharge, dream.energy).Value);
            long ticksToFull = CeilingToLong(remaining / energyPerTick);
            DreamDoubleTimeTick doubleTime = DreamDoubleTimeMath.Prepare(
                prestige.doubleTimeOwned,
                prestige.doubleTime,
                prestige.doubleTimeRate,
                TickSeconds);
            int panelsRequired = doubleTime.Active && prestige.doubleTimeRate >= 1
                ? Math.Min(10, prestige.doubleTimeRate)
                : 1;
            if (dream.dysonPanels >= panelsRequired)
            {
                long eventTick = Math.Max(1L, ticksToFull);
                horizon = Math.Min(horizon, eventTick - 1L);
            }
        }

        private static void AdvanceEnergyAndRailgun(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            double globalMultiplier,
            long ticks)
        {
            double energyPerTick =
                SpaceAgeManager.CalculateEnergyDelta(dream, globalMultiplier);
            double generated = NumericSafety.Multiply(energyPerTick, ticks).Value;
            double available = NumericSafety.Add(dream.energy, generated).Value;
            if (dream.railgunCharge < dream.railgunMaxCharge)
            {
                double room = dream.railgunMaxCharge - dream.railgunCharge;
                double transferred = Math.Min(room, available);
                dream.railgunCharge =
                    NumericSafety.Add(dream.railgunCharge, transferred).Value;
                available = Math.Max(0d, available - transferred);
            }
            dream.energy = available;
        }

        private static void LimitBeforeTimerEvent(
            ref long horizon,
            double progress,
            double duration,
            double incrementPerTick)
        {
            if (incrementPerTick <= 0d) return;
            long eventTick = CeilingToLong((duration - progress) / incrementPerTick);
            horizon = Math.Min(horizon, Math.Max(0L, eventTick - 1L));
        }

        private static void LimitBeforeResearchCompletion(
            ref long horizon,
            bool active,
            bool complete,
            double progress,
            double duration,
            double globalMultiplier)
        {
            if (!active || complete) return;
            LimitBeforeTimerEvent(
                ref horizon,
                progress,
                duration,
                TickSeconds * globalMultiplier);
        }

        private static void LimitAtBoostExpiry(ref long horizon, double remainingSeconds)
        {
            if (remainingSeconds <= 0d) return;
            horizon = Math.Min(
                horizon,
                CeilingToLong(remainingSeconds / TickSeconds));
        }

        private static double TimerIncrement(double sourceCount, double multiplier)
        {
            if (sourceCount < 1d || multiplier < 0d) return 0d;
            return NumericSafety.Multiply(
                1d + Math.Log10(sourceCount),
                NumericSafety.Multiply(multiplier, TickSeconds).Value).Value;
        }

        private static void AdvanceTimer(
            ref double progress,
            double incrementPerTick,
            long ticks)
        {
            progress = NumericSafety.Add(
                progress,
                NumericSafety.Multiply(incrementPerTick, ticks).Value).Value;
        }

        private static void AdvanceResearch(
            ref double progress,
            bool active,
            double globalMultiplier,
            long ticks)
        {
            if (!active) return;
            double perTick = NumericSafety.Multiply(TickSeconds, globalMultiplier).Value;
            AdvanceTimer(ref progress, perTick, ticks);
        }

        private static bool TimingIsValid(DreamOfflineTiming timing)
        {
            return Positive(timing.Hunter) &&
                   Positive(timing.Gatherer) &&
                   Positive(timing.Community) &&
                   Positive(timing.Housing) &&
                   Positive(timing.Villages) &&
                   Positive(timing.Workers) &&
                   Positive(timing.Cities) &&
                   Positive(timing.Factories) &&
                   Positive(timing.Bots) &&
                   Positive(timing.SpaceFactories);
        }

        private static bool Positive(double value) =>
            NumericSafety.IsFinite(value) && value > 0d;

        private static long CeilingToLong(double value)
        {
            if (!NumericSafety.IsFinite(value)) return long.MaxValue;
            if (value <= 0d) return 0L;
            NumericResult<long> converted = NumericSafety.ToLongFloor(Math.Ceiling(value));
            return converted.IsSuccess ? converted.Value : long.MaxValue;
        }

        private static long FloorToLong(double value)
        {
            NumericResult<long> converted = NumericSafety.ToLongFloor(Math.Floor(value));
            return converted.IsSuccess ? converted.Value : 0L;
        }
    }
}
