// WARNING: Do not modify! Generated file.

namespace UnityEngine.Purchasing.Security {
    public class GooglePlayTangle
    {
        private static byte[] data = System.Convert.FromBase64String("/Zmf2RdftKng/QfvM0XtiPYvOdWBbUYPOTvpZKlJCEvh9oLmIMkJ4WJtIRjSO8JfER/S6eZd4YanoNaBUfNj+qANrrBVtIaDXdtG8VTcTUSiBpbrokS+fNH/3KTd86ik3uUBnFbkZ0RWa2BvTOAu4JFrZ2dnY2ZlsLH8DRaeMWVwP9OvuWRoA+jsrzGR/b13RIYxiDS1YdebP7s7OsXWBiCoz2YTynzVYniNxwarLcZ3po5sHCBlalL7YgIJ/0i0vBMSLbkPdTjD82cXbenIj3MjaY9fkQKwhXxhaORnaWZW5GdsZORnZ2b4OzF2Bdo1uTI/Ack6W7OU7dr60+f8+8GM8hFLBbuMPEmuovQG/+ZzZEzw4x3J1FL0GgwWh2y9fWRlZ2Zn");
        private static int[] order = new int[] { 12,6,5,5,4,12,10,12,8,12,12,12,12,13,14 };
        private static int key = 102;

        public static readonly bool IsPopulated = true;

        public static byte[] Data() {
        	if (IsPopulated == false)
        		return null;
            return Obfuscator.DeObfuscate(data, order, key);
        }
    }
}
