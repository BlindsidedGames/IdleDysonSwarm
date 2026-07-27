/*
 * Purpose: Pure Dream automation transitions shared by active and stored time.
 * Runs: At the independent automation event boundary.
 * Owns: Facility conversions, rocket conversion, and durable railgun state.
 * Delegates: Presentation and authored timing values to scene adapters.
 */

using System;
using Expansion;
using Systems.Numeric;

namespace Systems.Simulation
{
    public static class DreamAutomationTransactions
    {
        public const double HousingToVillageCost = 10d;
        public const double VillageToCityCost = 25d;

        public static void ApplyFoundationalConversions(
            Oracle.SaveDataDream1 simulation)
        {
            if (simulation == null) return;
            if (simulation.housing >= HousingToVillageCost)
            {
                EconomyTransaction.TryPurchase(
                    ref simulation.housing,
                    HousingToVillageCost,
                    ref simulation.villages,
                    1d);
            }

            if (simulation.villages >= VillageToCityCost)
            {
                EconomyTransaction.TryPurchase(
                    ref simulation.villages,
                    VillageToCityCost,
                    ref simulation.cities,
                    1d);
            }
        }

        public static void ApplyRocketConversions(
            Oracle.SaveDataDream1 simulation)
        {
            if (simulation == null ||
                simulation.rocketsPerSpaceFactory <= 0)
            {
                return;
            }

            double conversions = Math.Min(
                Math.Floor(
                    simulation.rockets /
                    simulation.rocketsPerSpaceFactory),
                Math.Floor(simulation.factories));
            if (conversions <= 0d) return;
            double rocketCost = NumericSafety.Multiply(
                conversions,
                simulation.rocketsPerSpaceFactory).Value;
            EconomyTransaction.TryExchange(
                ref simulation.rockets,
                rocketCost,
                ref simulation.factories,
                conversions,
                ref simulation.spaceFactories,
                conversions);
        }

        public static void ApplyRailgun(
            Oracle.SaveDataDream1 simulation,
            Oracle.SaveDataPrestige prestige,
            double tickSeconds,
            double totalFireTime,
            int shotsPerVolley,
            int basePanelsRequiredToStart)
        {
            if (simulation == null ||
                prestige == null ||
                !NumericSafety.IsFinite(tickSeconds) ||
                tickSeconds <= 0d ||
                !NumericSafety.IsFinite(totalFireTime) ||
                totalFireTime <= 0d ||
                shotsPerVolley <= 0 ||
                basePanelsRequiredToStart <= 0 ||
                !NumericSafety.IsFinite(
                    simulation.railgunMaxCharge) ||
                simulation.railgunMaxCharge <= 0d)
            {
                return;
            }

            ChargeRailgun(simulation);

            int selectedRate = Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
            int activeRate = prestige.doDoubleTime &&
                             selectedRate >= 1
                ? selectedRate
                : 1;
            long panelsRequiredToStart =
                NumericSafety.Multiply(
                    (long)basePanelsRequiredToStart,
                    activeRate).Value;
            if (simulation.railgunCharge >=
                    simulation.railgunMaxCharge &&
                simulation.dysonPanels >= panelsRequiredToStart &&
                !simulation.railgunFiring)
            {
                simulation.railgunFiring = true;
                simulation.railgunFireProgress = 0d;
                simulation.railgunShotsRemaining =
                    shotsPerVolley;
            }

            if (!simulation.railgunFiring) return;

            double progressDelta = NumericSafety.Multiply(
                NumericSafety.Divide(
                    shotsPerVolley,
                    totalFireTime).Value,
                tickSeconds).Value;
            simulation.railgunFireProgress =
                NumericSafety.Add(
                    simulation.railgunFireProgress,
                    progressDelta).Value;
            double shotThreshold = NumericSafety.Divide(
                totalFireTime,
                shotsPerVolley).Value;
            double chargePerShot = NumericSafety.Divide(
                simulation.railgunMaxCharge,
                10d).Value;
            long panelsPerShot = activeRate;

            if (simulation.railgunFireProgress >=
                shotThreshold)
            {
                if (simulation.railgunCharge < chargePerShot ||
                    simulation.dysonPanels < panelsPerShot)
                {
                    StopRailgun(simulation);
                    return;
                }

                TransactionStatus status =
                    EconomyTransaction.TryExchange(
                        ref simulation.railgunCharge,
                        chargePerShot,
                        ref simulation.dysonPanels,
                        panelsPerShot,
                        ref simulation.swarmPanels,
                        panelsPerShot);
                if (status != TransactionStatus.Success)
                {
                    StopRailgun(simulation);
                    return;
                }

                simulation.railgunFireProgress = 0d;
                simulation.railgunShotsRemaining = Math.Max(
                    0,
                    simulation.railgunShotsRemaining - 1);
            }

            if (simulation.railgunCharge < chargePerShot ||
                simulation.railgunShotsRemaining <= 0)
            {
                StopRailgun(simulation);
            }
        }

        private static void ChargeRailgun(
            Oracle.SaveDataDream1 simulation)
        {
            if (simulation.energy <= 0d ||
                simulation.railgunCharge >=
                simulation.railgunMaxCharge)
            {
                return;
            }

            double remaining = NumericSafety.Subtract(
                simulation.railgunMaxCharge,
                simulation.railgunCharge).Value;
            double requested = Math.Min(
                remaining,
                simulation.energy);
            DebitResult debit = EconomyTransaction.TryDebit(
                simulation.energy,
                requested);
            if (!debit.Succeeded) return;
            NumericResult<double> charge = NumericSafety.Add(
                simulation.railgunCharge,
                debit.Charged);
            if (!charge.IsSuccess ||
                charge.Value <= simulation.railgunCharge)
            {
                return;
            }
            simulation.energy = debit.Balance;
            simulation.railgunCharge = Math.Min(
                simulation.railgunMaxCharge,
                charge.Value);
        }

        private static void StopRailgun(
            Oracle.SaveDataDream1 simulation)
        {
            simulation.railgunFiring = false;
            simulation.railgunFireProgress = 0d;
            simulation.railgunShotsRemaining = 0;
        }
    }
}
