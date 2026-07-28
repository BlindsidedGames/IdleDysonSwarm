using System;
using System.Collections.Generic;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class UnifiedEventTimeSimulationTests
    {
        [TestCase(0, 8, 0)]
        [TestCase(7, 8, 7)]
        [TestCase(8, 8, 0)]
        [TestCase(-1, 8, 7)]
        [TestCase(42, 0, 0)]
        public void AutomationRotation_NormalizesPersistedPhase(
            int input,
            int targetCount,
            int expected)
        {
            Assert.AreEqual(
                expected,
                AutomationRotation.Normalize(input, targetCount));
        }

        [Test]
        public void AutomationRotation_SkippedTicksMatchSequentialTicks()
        {
            const int targetCount = 8;
            const long skipped = 42_000_000L;
            int batched = AutomationRotation.Advance(
                5,
                targetCount,
                skipped);
            int sequential = 5;
            for (int i = 0; i < skipped % targetCount; i++)
            {
                sequential = AutomationRotation.Advance(
                    sequential,
                    targetCount,
                    1L);
            }

            Assert.AreEqual(sequential, batched);
        }

        [Test]
        public void StoredTimeAccounting_NoResetAccumulatesCurrentCycle()
        {
            InfinityStoredTimeUsage usage =
                InfinityStoredTimeAccounting.AdvanceWithoutReset(
                    2d,
                    7d,
                    0.15d);

            Assert.AreEqual(2.15d, usage.CurrentInfinity, 1e-12d);
            Assert.AreEqual(7d, usage.PreviousInfinity, 0d);
        }

        [Test]
        public void StoredTimeAccounting_OneResetRollsAllConsumedTime()
        {
            InfinityStoredTimeUsage usage =
                InfinityStoredTimeAccounting.CompleteAggregate(
                    2d,
                    7d,
                    1.2d,
                    1L,
                    1.2d);

            Assert.AreEqual(0d, usage.CurrentInfinity, 0d);
            Assert.AreEqual(3.2d, usage.PreviousInfinity, 1e-12d);
        }

        [Test]
        public void StoredTimeAccounting_MultipleResetsPreserveLastCycleDuration()
        {
            InfinityStoredTimeUsage usage =
                InfinityStoredTimeAccounting.CompleteAggregate(
                    0d,
                    7d,
                    6d,
                    5L,
                    0.8d);

            Assert.AreEqual(0d, usage.CurrentInfinity, 0d);
            Assert.AreEqual(0.8d, usage.PreviousInfinity, 1e-12d);
        }

        [Test]
        public void CoincidentBoundary_UsesApprovedDeterministicOrder()
        {
            var model = new FakeModel { EventHorizon = 0.1d };
            SimulationAdvanceResult result =
                UnifiedEventTimeSimulation.Advance(
                    new SimulationAdvanceRequest
                    {
                        StartingState = model,
                        DurationSeconds = 0.1d,
                        AutomationIntervalSeconds = 0.1d,
                        AutomationTimeUntilNextEvent = 0.1d,
                        ProcessingBudgetMilliseconds = 0d,
                        QueuedInputs = new[]
                        {
                            new SimulationQueuedInput(
                                0.1d,
                                SimulationInputKind.BreakTarget,
                                discreteValue: 42L)
                        }
                    });

            Assert.IsTrue(result.Completed);
            CollectionAssert.AreEqual(
                new[]
                {
                    "advance",
                    "production",
                    "input",
                    "automation",
                    "derived",
                    "dream",
                    "bot-cap",
                    "infinity"
                },
                ((FakeModel)result.CandidateState).Calls);
        }

        [Test]
        public void StoredTime_ForcesBuyMaxWithoutChangingModelPreference()
        {
            var model = new FakeModel
            {
                EventHorizon = 10d,
                ConfiguredMode = 10
            };
            SimulationAdvanceResult result =
                UnifiedEventTimeSimulation.Advance(
                    new SimulationAdvanceRequest
                    {
                        StartingState = model,
                        DurationSeconds = 0.1d,
                        Mode = SimulationAdvanceMode.StoredTime,
                        AutomationPolicy =
                            SimulationAutomationPolicy.ForceBuyMax,
                        AutomationIntervalSeconds = 0.1d,
                        AutomationTimeUntilNextEvent = 0.1d,
                        ProcessingBudgetMilliseconds = 0d
                    });

            var final = (FakeModel)result.CandidateState;
            Assert.AreEqual(10, final.ConfiguredMode);
            Assert.AreEqual(
                SimulationAutomationPolicy.ForceBuyMax,
                final.LastAutomationPolicy);
        }

        [Test]
        public void QueuedSliderChange_AffectsOnlyUnprocessedSegment()
        {
            var model = new FakeModel { EventHorizon = 10d };
            SimulationAdvanceResult result =
                UnifiedEventTimeSimulation.Advance(
                    new SimulationAdvanceRequest
                    {
                        StartingState = model,
                        DurationSeconds = 0.25d,
                        AutomationIntervalSeconds = 1d,
                        AutomationTimeUntilNextEvent = 1d,
                        ProcessingBudgetMilliseconds = 0d,
                        QueuedInputs = new[]
                        {
                            new SimulationQueuedInput(
                                0.15d,
                                SimulationInputKind.BreakTarget,
                                discreteValue: 99L)
                        }
                    });

            var final = (FakeModel)result.CandidateState;
            Assert.IsTrue(result.Completed);
            Assert.AreEqual(0.25d, final.AdvancedSeconds, 1e-12d);
            Assert.AreEqual(99L, final.BreakTarget);
            Assert.AreEqual(2, final.AdvanceSegments.Count);
            Assert.AreEqual(0.15d, final.AdvanceSegments[0], 1e-12d);
            Assert.AreEqual(0.10d, final.AdvanceSegments[1], 1e-12d);
        }

        [Test]
        public void InvalidAcceleration_IsRejectedAndExactPathRuns()
        {
            var model = new FakeModel
            {
                EventHorizon = 10d,
                OfferAcceleration = true,
                AccelerationError =
                    SimulationAccuracyContract
                        .AllowedProjectionDisagreement(0.5d) * 2d
            };
            SimulationAdvanceResult result =
                UnifiedEventTimeSimulation.Advance(
                    new SimulationAdvanceRequest
                    {
                        StartingState = model,
                        DurationSeconds = 0.5d,
                        AutomationIntervalSeconds = 1d,
                        AutomationTimeUntilNextEvent = 1d,
                        ProcessingBudgetMilliseconds = 0d
                    });

            Assert.IsTrue(result.Completed);
            Assert.AreEqual(
                0.5d,
                ((FakeModel)result.CandidateState).AdvancedSeconds,
                1e-12d);
        }

        [Test]
        public void FramePartitioning_PreservesAutomationPhaseAndState()
        {
            var wholeModel = new FakeModel { EventHorizon = 10d };
            SimulationAdvanceResult whole =
                UnifiedEventTimeSimulation.Advance(
                    new SimulationAdvanceRequest
                    {
                        StartingState = wholeModel,
                        DurationSeconds = 0.35d,
                        AutomationIntervalSeconds = 0.1d,
                        AutomationTimeUntilNextEvent = 0.1d,
                        ProcessingBudgetMilliseconds = 0d,
                        CloneStartingState = false
                    });

            var splitModel = new FakeModel { EventHorizon = 10d };
            double phase = 0.1d;
            foreach (double duration in new[] { 0.07d, 0.11d, 0.17d })
            {
                SimulationAdvanceResult part =
                    UnifiedEventTimeSimulation.Advance(
                        new SimulationAdvanceRequest
                        {
                            StartingState = splitModel,
                            DurationSeconds = duration,
                            AutomationIntervalSeconds = 0.1d,
                            AutomationTimeUntilNextEvent = phase,
                            ProcessingBudgetMilliseconds = 0d,
                            CloneStartingState = false
                        });
                phase = part.AutomationTimeUntilNextEvent;
            }

            Assert.AreEqual(
                wholeModel.AdvancedSeconds,
                splitModel.AdvancedSeconds,
                1e-12d);
            Assert.AreEqual(
                whole.AutomationTimeUntilNextEvent,
                phase,
                1e-12d);
            Assert.AreEqual(
                Count(wholeModel.Calls, "automation"),
                Count(splitModel.Calls, "automation"));
        }

        [Test]
        public void Reality_FractionalProgressSurvivesPartitioning()
        {
            RealityAdvanceResult whole = RealitySimulation.Advance(
                0.25d, 0L, 0L, true, 3.5d, 1.2d, 128L);
            RealityAdvanceResult first = RealitySimulation.Advance(
                0.25d, 0L, 0L, true, 3.5d, 0.5d, 128L);
            RealityAdvanceResult second = RealitySimulation.Advance(
                first.FractionalProgress,
                first.WorkersReady,
                first.Influence,
                true,
                3.5d,
                0.7d,
                128L);

            Assert.AreEqual(whole.Influence, second.Influence);
            Assert.AreEqual(
                whole.FractionalProgress,
                second.FractionalProgress,
                1e-12d);
        }

        [Test]
        public void Reality_ManualCapacityStallsWithoutBlockingOtherTime()
        {
            RealityAdvanceResult result = RealitySimulation.Advance(
                0.5d, 127L, 12L, false, 10d, 10d, 128L);

            Assert.AreEqual(128L, result.WorkersReady);
            Assert.AreEqual(12L, result.Influence);
            Assert.AreEqual(1L, result.WorkersGenerated);
            Assert.Greater(result.StalledSeconds, 0d);
            Assert.LessOrEqual(result.StalledSeconds, 10d);
        }

        [Test]
        public void Reality_AutoGatherAtInfluenceCapDoesNotOverreportCredit()
        {
            RealityAdvanceResult result = RealitySimulation.Advance(
                0d,
                0L,
                long.MaxValue,
                true,
                10d,
                1d,
                128L);

            Assert.AreEqual(long.MaxValue, result.Influence);
            Assert.AreEqual(10L, result.WorkersGenerated);
            Assert.AreEqual(0L, result.AutomaticInfluence);
        }

        [Test]
        public void Reality_AutoGatherCreditsOnlyRemainingInfluenceCapacity()
        {
            RealityAdvanceResult result = RealitySimulation.Advance(
                0d,
                0L,
                long.MaxValue - 2L,
                true,
                10d,
                1d,
                128L);

            Assert.AreEqual(long.MaxValue, result.Influence);
            Assert.AreEqual(10L, result.WorkersGenerated);
            Assert.AreEqual(2L, result.AutomaticInfluence);
        }

        [Test]
        public void DreamAdaptive_RepresentativeEighteenHoursValidates()
        {
            var dream = new Expansion.Oracle.SaveDataDream1
            {
                hunters = 10L,
                gatherers = 10L,
                community = 5d,
                housing = 1d,
                villages = 1d,
                workers = 1d,
                cities = 1d,
                factories = 1d,
                bots = 10d,
                spaceFactories = 1d
            };
            var prestige = new Expansion.Oracle.SaveDataPrestige
            {
                disasterStage = 42L
            };
            var timing = new DreamOfflineTiming(
                3d, 3d, 3d, 20d, 12d, 4d, 3d, 30d, 20d, 2d, false);

            bool advanced =
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    dream,
                    prestige,
                    timing,
                    18d * 60d * 60d,
                    out double error);

            Assert.IsTrue(
                advanced,
                $"segments={DreamAdaptiveLongIntervalSimulation.LastSegments};error={error:R};field={DreamAdaptiveLongIntervalSimulation.LastErrorField};values={DreamAdaptiveLongIntervalSimulation.LastErrorCoarseValue:R}/{DreamAdaptiveLongIntervalSimulation.LastErrorFineValue:R}");
            Assert.LessOrEqual(
                error,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void DreamEventHorizon_CanBeFasterThanSixtyPerSecond()
        {
            var dream = new Expansion.Oracle.SaveDataDream1
            {
                factories = 1d,
                bots = 99d,
                factoriesTimerProgress = 0d,
                rocketsPerSpaceFactory = 1L
            };
            var prestige = new Expansion.Oracle.SaveDataPrestige
            {
                disasterStage = 2L
            };
            var timing = new DreamOfflineTiming(
                3d,
                3d,
                3d,
                20d,
                12d,
                4d,
                3d,
                SimulationAccuracyContract.MaximumAggregateRelativeError,
                20d,
                2d,
                false);

            double horizon =
                DreamAnalyticalOfflineSimulation
                    .GetNextMaterialEventSeconds(
                        dream,
                        prestige,
                        timing,
                        1d);

            Assert.Greater(horizon, 0d);
            Assert.Less(horizon, 1d / 60d);
        }

        [Test]
        public void DreamEventHorizon_ReadyResetIsImmediate()
        {
            var dream = new Expansion.Oracle.SaveDataDream1
            {
                bots = 100d,
                rocketsPerSpaceFactory = 1L
            };
            var prestige = new Expansion.Oracle.SaveDataPrestige
            {
                disasterStage = 2L
            };
            var timing = new DreamOfflineTiming(
                3d, 3d, 3d, 20d, 12d, 4d, 3d, 30d, 20d, 2d, false);

            Assert.AreEqual(
                0d,
                DreamAnalyticalOfflineSimulation
                    .GetNextMaterialEventSeconds(
                        dream,
                        prestige,
                        timing,
                        1d));
        }

        [Test]
        public void DreamCycleTracker_RequiresThreeIdenticalExactCycles()
        {
            var tracker = new DreamCycleTracker();
            var dream = new Expansion.Oracle.SaveDataDream1
            {
                rocketsPerSpaceFactory = 10L
            };
            var prestige = new Expansion.Oracle.SaveDataPrestige
            {
                disasterStage = 2L
            };

            for (int cycle = 0; cycle < 4; cycle++)
            {
                tracker.AddElapsed(1.2d);
                long countBefore = prestige.simulationCount;
                long rewardBefore = prestige.strangeMatter;
                prestige.simulationCount++;
                prestige.strangeMatter += 10L;
                tracker.ObserveReset(
                    countBefore,
                    rewardBefore,
                    DreamResetCause.ArtificialIntelligence,
                    dream,
                    prestige);
            }

            Assert.IsTrue(
                tracker.TryGetStableCycle(
                    dream,
                    prestige,
                    out double duration,
                    out long reward,
                    out DreamResetCause cause));
            Assert.AreEqual(1.2d, duration, 1e-12d);
            Assert.AreEqual(10L, reward);
            Assert.AreEqual(
                DreamResetCause.ArtificialIntelligence,
                cause);
        }

        [Test]
        public void DreamCycleTracker_RejectsChangedPostResetSignature()
        {
            var tracker = new DreamCycleTracker();
            var dream = new Expansion.Oracle.SaveDataDream1
            {
                rocketsPerSpaceFactory = 10L
            };
            var prestige = new Expansion.Oracle.SaveDataPrestige
            {
                disasterStage = 2L
            };

            for (int cycle = 0; cycle < 4; cycle++)
            {
                tracker.AddElapsed(1.2d);
                long countBefore = prestige.simulationCount;
                long rewardBefore = prestige.strangeMatter;
                prestige.simulationCount++;
                prestige.strangeMatter += 10L;
                if (cycle == 2)
                    dream.hunters = 1L;
                tracker.ObserveReset(
                    countBefore,
                    rewardBefore,
                    DreamResetCause.ArtificialIntelligence,
                    dream,
                    prestige);
            }

            Assert.IsFalse(
                tracker.TryGetStableCycle(
                    dream,
                    prestige,
                    out _,
                    out _,
                    out _));
        }

        [Test]
        public void Statistics_RecordResetEventsInTotalsWindowsAndRecentSegment()
        {
            var statistics = new SimulationStatistics();
            statistics.RecordSegment(
                12d,
                new SimulationPresentationSummary());
            statistics.RecordInfinityAggregate(
                breakInfinity: true,
                cycleCount: 3L,
                totalReward: 90L,
                lastDurationSeconds: 1.2d,
                lastReward: 32L);
            statistics.RecordDreamReset(
                DreamResetCause.ArtificialIntelligence,
                10L);

            Assert.AreEqual(3L, statistics.lifetime.breakInfinityCount);
            Assert.AreEqual(90L, statistics.lifetime.breakInfinityPoints);
            Assert.AreEqual(1L, statistics.lifetime.aiDreamResets);
            Assert.AreEqual(10L, statistics.lifetime.strangeMatter);
            Assert.AreEqual(3L, statistics.minuteWindows[0].infinityCount);
            Assert.AreEqual(1L, statistics.minuteWindows[0].dreamResetCount);
            Assert.AreEqual(
                3L,
                statistics.recentProcessedSegment.breakInfinityCount);
            Assert.AreEqual(
                1L,
                statistics.recentProcessedSegment.aiDreamResets);
            Assert.AreEqual(
                DreamResetCause.ArtificialIntelligence.ToString(),
                statistics.lastCompletedCycle.dreamCause);
            Assert.AreEqual(
                0d,
                statistics.lastCompletedCycle.durationSeconds);
        }

        [Test]
        public void Statistics_AggregateEventsAreDistributedAcrossUpcomingInterval()
        {
            var statistics = new SimulationStatistics();

            statistics.RecordInfinityAggregate(
                breakInfinity: true,
                cycleCount: 120L,
                totalReward: 1200L,
                lastDurationSeconds: 1d,
                lastReward: 10L,
                aggregateDurationSeconds: 120d);
            statistics.RecordSegment(
                120d,
                new SimulationPresentationSummary());

            Assert.AreEqual(
                60L,
                statistics.minuteWindows[0].infinityCount);
            Assert.AreEqual(
                600L,
                statistics.minuteWindows[0].infinityPoints);
            Assert.AreEqual(
                60L,
                statistics.minuteWindows[1].infinityCount);
            Assert.AreEqual(
                600L,
                statistics.minuteWindows[1].infinityPoints);
            Assert.AreEqual(
                120L,
                statistics.lifetime.breakInfinityCount);
            Assert.AreEqual(
                120d,
                statistics.lifetime.simulatedSeconds,
                0d);
        }

        [Test]
        public void Statistics_DistributedAggregatePreservesIntegerTotalsAcrossUnevenWindows()
        {
            var statistics = new SimulationStatistics();

            statistics.RecordDreamAggregate(
                DreamResetCause.Meteor,
                cycleCount: 7L,
                totalStrangeMatter: 7L,
                lastReward: 1L,
                aggregateDurationSeconds: 90d);
            statistics.RecordSegment(
                90d,
                new SimulationPresentationSummary());

            Assert.AreEqual(
                4L,
                statistics.minuteWindows[0].dreamResetCount);
            Assert.AreEqual(
                3L,
                statistics.minuteWindows[1].dreamResetCount);
            Assert.AreEqual(
                7L,
                statistics.lifetime.meteorDreamResets);
            Assert.AreEqual(
                7L,
                statistics.lifetime.strangeMatter);
        }

        [Test]
        public void Statistics_NewQuantumRunPreservesLifetimeAndHistory()
        {
            var statistics = new SimulationStatistics();
            statistics.RecordSegment(
                60d,
                new SimulationPresentationSummary
                {
                    OrdinaryInfinityCount = 2L,
                    OrdinaryInfinityPoints = 2L
                });

            statistics.StartNewQuantumRun();

            Assert.AreEqual(2L, statistics.lifetime.ordinaryInfinityCount);
            Assert.AreEqual(2L, statistics.minuteWindows[1].infinityCount);
            Assert.AreEqual(0L, statistics.currentQuantumRun.ordinaryInfinityCount);
            Assert.AreEqual(0d, statistics.currentQuantumRun.simulatedSeconds);
        }

        [Test]
        public void Statistics_LongSegmentPopulatesOnlyRetainedRollingWindows()
        {
            var statistics = new SimulationStatistics();
            statistics.RecordSegment(
                90d * 60d,
                new SimulationPresentationSummary());

            double retainedMinuteSeconds = 0d;
            for (int index = 0;
                 index < statistics.minuteWindows.Length;
                 index++)
            {
                retainedMinuteSeconds +=
                    statistics.minuteWindows[index].simulatedSeconds;
            }

            Assert.AreEqual(
                59d * 60d,
                retainedMinuteSeconds,
                1e-9d);
            Assert.AreEqual(
                90L,
                statistics.minuteWindows[30].sequence);
            Assert.AreEqual(
                90d * 60d,
                statistics.lifetime.simulatedSeconds,
                1e-9d);
        }

        [Test]
        [Timeout(1000)]
        public void Statistics_MaximumTrackedTimeDoesNotWrapWindowSequence()
        {
            var statistics = new SimulationStatistics
            {
                trackedSimulatedSeconds = double.MaxValue
            };

            statistics.RecordSegment(
                double.MaxValue,
                new SimulationPresentationSummary
                {
                    OrdinaryInfinityCount = 1L
                });

            int expectedIndex = (int)(
                long.MaxValue %
                statistics.minuteWindows.Length);
            Assert.AreEqual(
                long.MaxValue,
                statistics.minuteWindows[expectedIndex].sequence);
            Assert.AreEqual(
                1L,
                statistics.lifetime.ordinaryInfinityCount);
        }

        private sealed class FakeModel : IEventTimeSimulationModel
        {
            public double EventHorizon;
            public double AdvancedSeconds;
            public readonly List<double> AdvanceSegments = new();
            public readonly List<string> Calls = new();
            public int ConfiguredMode;
            public long BreakTarget;
            public SimulationAutomationPolicy LastAutomationPolicy;
            public bool OfferAcceleration;
            public double AccelerationError;

            public IEventTimeSimulationModel Clone()
            {
                return new FakeModel
                {
                    EventHorizon = EventHorizon,
                    AdvancedSeconds = AdvancedSeconds,
                    ConfiguredMode = ConfiguredMode,
                    BreakTarget = BreakTarget,
                    OfferAcceleration = OfferAcceleration,
                    AccelerationError = AccelerationError
                };
            }

            public bool IsFiniteAndValid(out string diagnosticCode)
            {
                diagnosticCode = null;
                return !double.IsNaN(AdvancedSeconds) &&
                       !double.IsInfinity(AdvancedSeconds);
            }

            public double TimeToNextMaterialEvent(
                double maximumSeconds,
                double infinityMinimumCycleSeconds)
            {
                return Math.Min(maximumSeconds, EventHorizon);
            }

            public void AdvanceContinuous(double seconds)
            {
                Calls.Add("advance");
                AdvanceSegments.Add(seconds);
                AdvancedSeconds += seconds;
            }

            public void ApplyProductionArrivals(
                SimulationPresentationSummary summary)
            {
                Calls.Add("production");
            }

            public void ApplyAutomation(
                SimulationAutomationPolicy policy,
                SimulationPresentationSummary summary)
            {
                Calls.Add("automation");
                LastAutomationPolicy = policy;
            }

            public void ApplyDerivedTimersAndDoubleTime(
                double seconds,
                SimulationPresentationSummary summary)
            {
                Calls.Add("derived");
            }

            public void ApplyDreamReset(
                SimulationPresentationSummary summary)
            {
                Calls.Add("dream");
            }

            public void ApplyBotCapTransition(
                SimulationPresentationSummary summary)
            {
                Calls.Add("bot-cap");
            }

            public void ApplyInfinityReset(
                double minimumCycleSeconds,
                SimulationPresentationSummary summary)
            {
                Calls.Add("infinity");
            }

            public void ApplyQueuedInput(
                SimulationQueuedInput input,
                SimulationPresentationSummary summary)
            {
                Calls.Add("input");
                if (input.Kind == SimulationInputKind.BreakTarget)
                    BreakTarget = input.DiscreteValue;
            }

            public bool TryAccelerate(
                double maximumSeconds,
                SimulationAdvanceRequest request,
                out SimulationAccelerationResult acceleration)
            {
                acceleration = new SimulationAccelerationResult(
                    OfferAcceleration,
                    maximumSeconds,
                    null,
                    AccelerationError);
                return OfferAcceleration;
            }
        }

        private static int Count(
            List<string> values,
            string expected)
        {
            int count = 0;
            for (int index = 0; index < values.Count; index++)
            {
                if (values[index] == expected)
                    count++;
            }
            return count;
        }
    }
}
