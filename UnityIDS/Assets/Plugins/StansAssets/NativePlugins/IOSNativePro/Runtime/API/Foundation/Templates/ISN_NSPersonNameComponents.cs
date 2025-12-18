using System;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// An NSPersonNameComponents object encapsulates the components of a person's name in an extendable,
    /// object-oriented manner.
    /// It is used to specify a person's name by providing the components comprising
    /// a full name: given name, middle name, family name, prefix, suffix, nickname, and phonetic representation.
    ///
    /// It is important to understand that names are disjoint from a person’s identity.
    /// An individual may, at any time, have zero, one, or many names. Names cannot be used as a determination of a person’s identity,
    /// because two names may correspond to the same individual, and two people may have the same name.
    /// Nor can names be used as a determination of a person’s relation to others, because an individual may have a different family name than their relatives,
    /// and two individuals may have the same family name, but not be related.
    ///
    /// Many locales and cultures have rules about what kinds of names are allowed and how they are structured.
    /// An <see cref="ISN_NSPersonNameComponents"/> object does not impose any restrictions about which combinations
    /// of properties may have values or what those values may be.
    /// </summary>
    [Serializable]
    public class ISN_NSPersonNameComponents
    {
        [SerializeField]
        string m_NamePrefix = string.Empty;
        [SerializeField]
        string m_GivenName = string.Empty;
        [SerializeField]
        string m_MiddleName = string.Empty;
        [SerializeField]
        string m_FamilyName = string.Empty;
        [SerializeField]
        string m_NameSuffix = string.Empty;
        [SerializeField]
        string m_Nickname = string.Empty;

        /// <summary>
        /// The portion of a name’s full form of address that precedes the name itself (for example, “Dr.,” “Mr.,” “Ms.”).
        /// </summary>
        public string NamePrefix => m_NamePrefix;

        /// <summary>
        /// Name bestowed upon an individual to differentiate them from other members of a group that share a family name (for example, “Johnathan”).
        /// </summary>
        public string GivenName => m_GivenName;

        /// <summary>
        /// Secondary name bestowed upon an individual to differentiate them from others that have the same given name (for example, “Maple”).
        /// </summary>
        public string MiddleName => m_MiddleName;

        /// <summary>
        /// Name bestowed upon an individual to denote membership in a group or family. (for example, “Appleseed”).
        /// </summary>
        public string FamilyName => m_FamilyName;

        /// <summary>
        /// The portion of a name’s full form of address that follows the name itself (for example, “Esq.,” “Jr.,” “Ph.D.”).
        /// </summary>
        public string NameSuffix => m_NameSuffix;

        /// <summary>
        /// Name substituted for the purposes of familiarity (for example, "Johnny").
        /// </summary>
        public string Nickname => m_Nickname;
    }
}
