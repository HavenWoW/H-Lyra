//! Client locale identifiers.
//!
//! The order matches HavenCore's `LocaleConstant`, because a DB2 header stores
//! the locales it carries as a bitmask indexed by that enum.

/// Locale names in `LocaleConstant` order. Index 9 is the "no locale" slot and
/// is never a valid client directory.
pub const LOCALE_NAMES: [&str; 12] = [
    "enUS", "koKR", "frFR", "deDE", "zhCN", "zhTW", "esES", "esMX", "ruRU", "none", "ptBR", "itIT",
];

/// Bit index of a locale inside a DB2 header locale mask.
pub fn locale_index(name: &str) -> Option<u32> {
    LOCALE_NAMES
        .iter()
        .position(|candidate| candidate.eq_ignore_ascii_case(name))
        .filter(|index| *index != 9)
        .map(|index| index as u32)
}

/// Renders a header locale mask as a readable list of locale names.
pub fn describe_locale_mask(mask: u32) -> String {
    if mask == u32::MAX {
        return String::from("all locales");
    }
    let names: Vec<&str> = LOCALE_NAMES
        .iter()
        .enumerate()
        .filter(|(index, _)| mask & (1 << index) != 0)
        .map(|(_, name)| *name)
        .collect();
    if names.is_empty() {
        String::from("none")
    } else {
        names.join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_locales_resolve_to_their_bit_index() {
        assert_eq!(locale_index("enUS"), Some(0));
        assert_eq!(locale_index("deDE"), Some(3));
        assert_eq!(locale_index("itIT"), Some(11));
        assert_eq!(locale_index("EnUs"), Some(0));
    }

    #[test]
    fn the_placeholder_slot_and_unknown_names_are_rejected() {
        assert_eq!(locale_index("none"), None);
        assert_eq!(locale_index("xxYY"), None);
    }

    #[test]
    fn masks_are_described_by_name() {
        assert_eq!(describe_locale_mask(1), "enUS");
        assert_eq!(describe_locale_mask(u32::MAX), "all locales");
        assert_eq!(describe_locale_mask(0), "none");
    }
}
