namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Comparison operators for condition evaluation.
    /// </summary>
    public enum ComparisonOperator
    {
        /// <summary>Value must equal the threshold.</summary>
        Equal,

        /// <summary>Value must not equal the threshold.</summary>
        NotEqual,

        /// <summary>Value must be greater than the threshold.</summary>
        GreaterThan,

        /// <summary>Value must be greater than or equal to the threshold.</summary>
        GreaterOrEqual,

        /// <summary>Value must be less than the threshold.</summary>
        LessThan,

        /// <summary>Value must be less than or equal to the threshold.</summary>
        LessOrEqual
    }

    /// <summary>
    /// Helper methods for ComparisonOperator.
    /// </summary>
    public static class ComparisonOperatorExtensions
    {
        /// <summary>
        /// Compare two integer values using the specified operator.
        /// </summary>
        public static bool Compare(this ComparisonOperator op, int value, int threshold)
        {
            return op switch
            {
                ComparisonOperator.Equal => value == threshold,
                ComparisonOperator.NotEqual => value != threshold,
                ComparisonOperator.GreaterThan => value > threshold,
                ComparisonOperator.GreaterOrEqual => value >= threshold,
                ComparisonOperator.LessThan => value < threshold,
                ComparisonOperator.LessOrEqual => value <= threshold,
                _ => false
            };
        }

        /// <summary>
        /// Compare two double values using the specified operator.
        /// </summary>
        public static bool Compare(this ComparisonOperator op, double value, double threshold)
        {
            const double epsilon = 0.0001;
            return op switch
            {
                ComparisonOperator.Equal => System.Math.Abs(value - threshold) < epsilon,
                ComparisonOperator.NotEqual => System.Math.Abs(value - threshold) >= epsilon,
                ComparisonOperator.GreaterThan => value > threshold,
                ComparisonOperator.GreaterOrEqual => value >= threshold - epsilon,
                ComparisonOperator.LessThan => value < threshold,
                ComparisonOperator.LessOrEqual => value <= threshold + epsilon,
                _ => false
            };
        }

        /// <summary>
        /// Get the display symbol for a comparison operator.
        /// </summary>
        public static string ToSymbol(this ComparisonOperator op)
        {
            return op switch
            {
                ComparisonOperator.Equal => "==",
                ComparisonOperator.NotEqual => "!=",
                ComparisonOperator.GreaterThan => ">",
                ComparisonOperator.GreaterOrEqual => ">=",
                ComparisonOperator.LessThan => "<",
                ComparisonOperator.LessOrEqual => "<=",
                _ => "?"
            };
        }
    }
}
