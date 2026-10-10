/// `1h 5m`, `45m` or `2h`, as on the web; None for no duration.
pub fn duration_hours_minutes(duration_in_ms: i64) -> Option<String> {
    if duration_in_ms <= 0 {
        return None;
    }
    let total_minutes = (duration_in_ms as f64 / 60_000.).round() as i64;
    let (hours, minutes) = (total_minutes / 60, total_minutes % 60);

    Some(match (hours, minutes) {
        (0, minutes) => format!("{minutes}m"),
        (hours, 0) => format!("{hours}h"),
        (hours, minutes) => format!("{hours}h {minutes}m"),
    })
}

/// `1 track`, `3 tracks`.
pub fn count(count: i64, singular: &str, plural: &str) -> String {
    format!("{count} {}", if count == 1 { singular } else { plural })
}

/// Up to two initials, e.g. `AC` for `Alex Choi`.
pub fn initials(name: &str) -> String {
    let initials: String = name
        .split_whitespace()
        .filter_map(|part| part.chars().next())
        .take(2)
        .flat_map(char::to_uppercase)
        .collect();
    if initials.is_empty() {
        "?".into()
    } else {
        initials
    }
}

pub fn country_label(code: &str) -> &str {
    match code {
        "XX" => "Unknown",
        "HK" => "Hong Kong",
        "JP" => "Japan",
        "KR" => "South Korea",
        "US" => "United States",
        "CN" => "China",
        "TW" => "Taiwan",
        "ID" => "Indonesia",
        "UK" => "United Kingdom",
        code => code,
    }
}

pub fn party_kind_label(kind: &str) -> &str {
    match kind {
        "VocaloidCreator" => "Vocaloid creator",
        "VoiceSynth" => "Voice synth",
        kind => kind,
    }
}
