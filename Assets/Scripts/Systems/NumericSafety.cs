/*
 * Purpose: Defines the finite, saturating numeric contract used by economy, save repair, and transactions.
 * Runs: Pure runtime/editor code; contains no Unity lifecycle or persistence side effects.
 * Primary entry points: NumericSafety arithmetic/conversion methods and EconomyTransaction.TryDebit.
 *
 * Contract:
 * - Gameplay doubles are always finite. Positive overflow saturates at double.MaxValue.
 * - Discrete counters saturate at long.MaxValue and never wrap.
 * - Invalid input, division by zero, and unrepresentable conversions are explicit results.
 * - A positive affordable debit always changes the balance by at least one representable step.
 */

using System;

namespace Systems.Numeric
{
    public enum NumericStatus
    {
        Success,
        Saturated,
        InvalidInput,
        DivisionByZero,
        Unrepresentable
    }

    public readonly struct NumericResult<T>
    {
        public NumericResult(T value, NumericStatus status)
        {
            Value = value;
            Status = status;
        }

        public T Value { get; }
        public NumericStatus Status { get; }
        public bool IsSuccess => Status == NumericStatus.Success || Status == NumericStatus.Saturated;
        public bool IsSaturated => Status == NumericStatus.Saturated;
    }

    public static class NumericSafety
    {
        public const double ContinuousMaximum = double.MaxValue;
        public const long DiscreteMaximum = long.MaxValue;
        public const double StoredTimeMaximumSeconds = 42000000d;
        private const double LongUpperExclusive = 9223372036854775808d;

        public static bool IsFinite(double value)
        {
            return !double.IsNaN(value) && !double.IsInfinity(value);
        }

        public static NumericResult<double> Add(double left, double right, bool allowNegative = false)
        {
            if (!IsFinite(left) || !IsFinite(right))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);

            double value = left + right;
            if (double.IsPositiveInfinity(value))
                return new NumericResult<double>(ContinuousMaximum, NumericStatus.Saturated);
            if (!IsFinite(value) || (!allowNegative && value < 0d))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            return new NumericResult<double>(value, NumericStatus.Success);
        }

        public static NumericResult<double> Subtract(double left, double right, bool allowNegative = false)
        {
            if (!IsFinite(left) || !IsFinite(right))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);

            double value = left - right;
            if (!IsFinite(value))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            if (!allowNegative && value < 0d)
                return new NumericResult<double>(0d, NumericStatus.Saturated);
            return new NumericResult<double>(value, NumericStatus.Success);
        }

        public static NumericResult<double> Multiply(double left, double right, bool allowNegative = false)
        {
            if (!IsFinite(left) || !IsFinite(right))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            if ((!allowNegative && (left < 0d || right < 0d)))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            if (left == 0d || right == 0d)
                return new NumericResult<double>(0d, NumericStatus.Success);

            double value = left * right;
            if (double.IsPositiveInfinity(value))
                return new NumericResult<double>(ContinuousMaximum, NumericStatus.Saturated);
            if (!IsFinite(value) || (!allowNegative && value < 0d))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            return new NumericResult<double>(value, NumericStatus.Success);
        }

        public static NumericResult<double> Divide(double numerator, double denominator, bool allowNegative = false)
        {
            if (!IsFinite(numerator) || !IsFinite(denominator))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            if (denominator == 0d)
                return new NumericResult<double>(0d, NumericStatus.DivisionByZero);

            double value = numerator / denominator;
            if (double.IsPositiveInfinity(value))
                return new NumericResult<double>(ContinuousMaximum, NumericStatus.Saturated);
            if (!IsFinite(value) || (!allowNegative && value < 0d))
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            return new NumericResult<double>(value, NumericStatus.Success);
        }

        public static NumericResult<double> Power(double value, double exponent)
        {
            if (!IsFinite(value) || !IsFinite(exponent) || value < 0d)
                return new NumericResult<double>(0d, NumericStatus.InvalidInput);
            if (value == 0d && exponent < 0d)
                return new NumericResult<double>(0d, NumericStatus.DivisionByZero);

            double result = Math.Pow(value, exponent);
            if (double.IsPositiveInfinity(result))
                return new NumericResult<double>(ContinuousMaximum, NumericStatus.Saturated);
            if (!IsFinite(result) || result < 0d)
                return new NumericResult<double>(0d, NumericStatus.Unrepresentable);
            return new NumericResult<double>(result, NumericStatus.Success);
        }

        public static NumericResult<long> Add(long left, long right)
        {
            if (right > 0 && left > long.MaxValue - right)
                return new NumericResult<long>(long.MaxValue, NumericStatus.Saturated);
            if (right < 0 && left < long.MinValue - right)
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);

            long value = left + right;
            if (value < 0)
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);
            return new NumericResult<long>(value, NumericStatus.Success);
        }

        public static NumericResult<long> Subtract(long left, long right)
        {
            if (left < 0L || right < 0L)
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);
            if (right > left)
                return new NumericResult<long>(0L, NumericStatus.Saturated);
            return new NumericResult<long>(left - right, NumericStatus.Success);
        }

        public static NumericResult<long> Multiply(long left, long right)
        {
            if (left < 0L || right < 0L)
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);
            if (left == 0L || right == 0L)
                return new NumericResult<long>(0L, NumericStatus.Success);
            if (left > long.MaxValue / right)
                return new NumericResult<long>(long.MaxValue, NumericStatus.Saturated);
            return new NumericResult<long>(left * right, NumericStatus.Success);
        }

        public static NumericResult<long> ToLongFloor(double value)
        {
            if (!IsFinite(value) || value < 0d)
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);
            if (value >= long.MaxValue)
                return new NumericResult<long>(long.MaxValue, NumericStatus.Saturated);
            return new NumericResult<long>((long)Math.Floor(value), NumericStatus.Success);
        }

        public static NumericResult<long> ToLong(double value)
        {
            if (!IsFinite(value))
                return new NumericResult<long>(0L, NumericStatus.InvalidInput);
            // (double)long.MaxValue rounds to 2^63, which is one past the actual long
            // range. Comparing against long.MaxValue therefore does not reject it.
            if (value < 0d || value >= LongUpperExclusive || Math.Truncate(value) != value)
                return new NumericResult<long>(0L, NumericStatus.Unrepresentable);
            return new NumericResult<long>((long)value, NumericStatus.Success);
        }

        public static NumericResult<int> ToInt(double value)
        {
            if (!IsFinite(value))
                return new NumericResult<int>(0, NumericStatus.InvalidInput);
            if (value < int.MinValue || value > int.MaxValue || Math.Truncate(value) != value)
                return new NumericResult<int>(0, NumericStatus.Unrepresentable);
            return new NumericResult<int>((int)value, NumericStatus.Success);
        }

        public static NumericResult<float> ToFloat(double value, bool allowNegative = false)
        {
            if (!IsFinite(value) || (!allowNegative && value < 0d))
                return new NumericResult<float>(0f, NumericStatus.InvalidInput);
            if (value > float.MaxValue)
                return new NumericResult<float>(float.MaxValue, NumericStatus.Saturated);
            if (value < -float.MaxValue)
                return allowNegative
                    ? new NumericResult<float>(-float.MaxValue, NumericStatus.Saturated)
                    : new NumericResult<float>(0f, NumericStatus.InvalidInput);
            return new NumericResult<float>((float)value, NumericStatus.Success);
        }

        public static double ClampContinuous(double value, double invalidReplacement = 0d)
        {
            if (double.IsPositiveInfinity(value)) return ContinuousMaximum;
            if (!IsFinite(value) || value < 0d) return invalidReplacement;
            return value;
        }

        public static double BitDecrement(double value)
        {
            if (double.IsNaN(value) || value == double.NegativeInfinity) return value;
            if (value == 0d) return -double.Epsilon;

            long bits = BitConverter.DoubleToInt64Bits(value);
            bits += value > 0d ? -1 : 1;
            return BitConverter.Int64BitsToDouble(bits);
        }
    }

    public enum TransactionStatus
    {
        Success,
        InsufficientFunds,
        InvalidBalance,
        InvalidCost,
        InvalidQuantity,
        OutputMaxed,
        Maxed
    }

    public enum BotCapTransitionAction
    {
        None,
        RepairInvalidBots,
        PersistPendingCheckpoint,
        GrantRewardsAndPersistCheckpoint,
        ResumeResetFromRewardCheckpoint
    }

    public static class BotCapTransitionContract
    {
        public static BotCapTransitionAction Classify(
            double bots,
            bool pending,
            bool rewardsGranted)
        {
            if (!NumericSafety.IsFinite(bots) || bots < 0d)
                return BotCapTransitionAction.RepairInvalidBots;
            if (bots != double.MaxValue)
                return BotCapTransitionAction.None;
            if (rewardsGranted)
                return BotCapTransitionAction.ResumeResetFromRewardCheckpoint;
            if (pending)
                return BotCapTransitionAction.GrantRewardsAndPersistCheckpoint;
            return BotCapTransitionAction.PersistPendingCheckpoint;
        }
    }

    public readonly struct DebitResult
    {
        public DebitResult(double balance, double charged, TransactionStatus status)
        {
            Balance = balance;
            Charged = charged;
            Status = status;
        }

        public double Balance { get; }
        public double Charged { get; }
        public TransactionStatus Status { get; }
        public bool Succeeded => Status == TransactionStatus.Success;
    }

    public readonly struct DiscreteDebitResult
    {
        public DiscreteDebitResult(long balance, long charged, TransactionStatus status)
        {
            Balance = balance;
            Charged = charged;
            Status = status;
        }

        public long Balance { get; }
        public long Charged { get; }
        public TransactionStatus Status { get; }
        public bool Succeeded => Status == TransactionStatus.Success;
    }

    public static class EconomyTransaction
    {
        public static TransactionStatus TryPurchase(
            ref long balance,
            long cost,
            ref long owned,
            long quantity,
            bool authoredFree = false)
        {
            NumericResult<long> nextOwned = NumericSafety.Add(owned, quantity);
            if (quantity <= 0L)
                return TransactionStatus.InvalidQuantity;
            if (!nextOwned.IsSuccess || nextOwned.Value <= owned)
                return TransactionStatus.OutputMaxed;

            DiscreteDebitResult debit = TryDebit(balance, cost, quantity, authoredFree);
            if (!debit.Succeeded)
                return debit.Status;

            balance = debit.Balance;
            owned = nextOwned.Value;
            return TransactionStatus.Success;
        }

        public static TransactionStatus TryPurchase(
            ref long balance,
            long cost,
            ref double owned,
            double quantity,
            bool authoredFree = false)
        {
            if (!NumericSafety.IsFinite(quantity) || quantity <= 0d)
                return TransactionStatus.InvalidQuantity;

            NumericResult<double> nextOwned = NumericSafety.Add(owned, quantity);
            if (!nextOwned.IsSuccess || nextOwned.Value <= owned)
                return TransactionStatus.OutputMaxed;

            DiscreteDebitResult debit = TryDebit(balance, cost, 1L, authoredFree);
            if (!debit.Succeeded)
                return debit.Status;

            balance = debit.Balance;
            owned = nextOwned.Value;
            return TransactionStatus.Success;
        }

        public static TransactionStatus TryPurchase(
            ref double balance,
            double cost,
            ref double owned,
            double quantity,
            bool authoredFree = false)
        {
            if (!NumericSafety.IsFinite(quantity) || quantity <= 0d)
                return TransactionStatus.InvalidQuantity;

            NumericResult<double> nextOwned = NumericSafety.Add(owned, quantity);
            if (!nextOwned.IsSuccess || nextOwned.Value <= owned)
                return TransactionStatus.OutputMaxed;

            DebitResult debit = TryDebit(balance, cost, 1L, authoredFree);
            if (!debit.Succeeded)
                return debit.Status;

            balance = debit.Balance;
            owned = nextOwned.Value;
            return TransactionStatus.Success;
        }

        public static TransactionStatus TryDebitPair(
            ref long firstBalance,
            long firstCost,
            ref long secondBalance,
            long secondCost)
        {
            DiscreteDebitResult firstDebit = TryDebit(firstBalance, firstCost);
            if (!firstDebit.Succeeded)
                return firstDebit.Status;

            DiscreteDebitResult secondDebit = TryDebit(secondBalance, secondCost);
            if (!secondDebit.Succeeded)
                return secondDebit.Status;

            firstBalance = firstDebit.Balance;
            secondBalance = secondDebit.Balance;
            return TransactionStatus.Success;
        }

        public static TransactionStatus TryExchange(
            ref double firstBalance,
            double firstCost,
            ref double secondBalance,
            double secondCost,
            ref double output,
            double outputQuantity)
        {
            if (!NumericSafety.IsFinite(outputQuantity) || outputQuantity <= 0d)
                return TransactionStatus.InvalidQuantity;

            NumericResult<double> nextOutput = NumericSafety.Add(output, outputQuantity);
            if (!nextOutput.IsSuccess || nextOutput.Value <= output)
                return TransactionStatus.OutputMaxed;

            DebitResult firstDebit = TryDebit(firstBalance, firstCost);
            if (!firstDebit.Succeeded)
                return firstDebit.Status;
            DebitResult secondDebit = TryDebit(secondBalance, secondCost);
            if (!secondDebit.Succeeded)
                return secondDebit.Status;

            firstBalance = firstDebit.Balance;
            secondBalance = secondDebit.Balance;
            output = nextOutput.Value;
            return TransactionStatus.Success;
        }

        public static TransactionStatus TryExchange(
            ref double continuousBalance,
            double continuousCost,
            ref long discreteBalance,
            long discreteCost,
            ref long output,
            long outputQuantity)
        {
            if (outputQuantity <= 0L)
                return TransactionStatus.InvalidQuantity;

            NumericResult<long> nextOutput = NumericSafety.Add(output, outputQuantity);
            if (!nextOutput.IsSuccess || nextOutput.Value <= output)
                return TransactionStatus.OutputMaxed;

            DebitResult continuousDebit = TryDebit(continuousBalance, continuousCost);
            if (!continuousDebit.Succeeded)
                return continuousDebit.Status;
            DiscreteDebitResult discreteDebit = TryDebit(discreteBalance, discreteCost);
            if (!discreteDebit.Succeeded)
                return discreteDebit.Status;

            continuousBalance = continuousDebit.Balance;
            discreteBalance = discreteDebit.Balance;
            output = nextOutput.Value;
            return TransactionStatus.Success;
        }

        public static DiscreteDebitResult TryDebit(
            long balance,
            long cost,
            long quantity = 1,
            bool authoredFree = false)
        {
            if (balance < 0L)
                return new DiscreteDebitResult(balance, 0L, TransactionStatus.InvalidBalance);
            if (quantity <= 0L)
                return new DiscreteDebitResult(balance, 0L, TransactionStatus.InvalidQuantity);
            if (cost < 0L)
                return new DiscreteDebitResult(balance, 0L, TransactionStatus.InvalidCost);
            if (cost == 0L)
                return authoredFree
                    ? new DiscreteDebitResult(balance, 0L, TransactionStatus.Success)
                    : new DiscreteDebitResult(balance, 0L, TransactionStatus.InvalidCost);
            if (cost > balance)
                return new DiscreteDebitResult(balance, 0L, TransactionStatus.InsufficientFunds);
            return new DiscreteDebitResult(balance - cost, cost, TransactionStatus.Success);
        }

        public static DebitResult TryDebit(double balance, double cost, long quantity = 1, bool authoredFree = false)
        {
            if (!NumericSafety.IsFinite(balance) || balance < 0d)
                return new DebitResult(balance, 0d, TransactionStatus.InvalidBalance);
            if (quantity <= 0)
                return new DebitResult(balance, 0d, TransactionStatus.InvalidQuantity);
            if (!NumericSafety.IsFinite(cost) || cost < 0d)
                return new DebitResult(balance, 0d, TransactionStatus.InvalidCost);
            if (cost == NumericSafety.ContinuousMaximum)
                return new DebitResult(balance, 0d, TransactionStatus.Maxed);
            if (cost == 0d)
                return authoredFree
                    ? new DebitResult(balance, 0d, TransactionStatus.Success)
                    : new DebitResult(balance, 0d, TransactionStatus.InvalidCost);
            if (cost > balance)
                return new DebitResult(balance, 0d, TransactionStatus.InsufficientFunds);

            double next = balance - cost;
            double charged = cost;
            if (next == balance)
            {
                next = NumericSafety.BitDecrement(balance);
                if (next < 0d || !NumericSafety.IsFinite(next))
                    next = 0d;
                charged = balance - next;
            }

            if (!NumericSafety.IsFinite(next) || next < 0d || charged <= 0d)
                return new DebitResult(balance, 0d, TransactionStatus.InvalidCost);
            return new DebitResult(next, charged, TransactionStatus.Success);
        }
    }
}
