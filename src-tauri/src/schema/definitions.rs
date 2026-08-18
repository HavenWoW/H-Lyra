use serde::{Deserialize, Serialize};

/// Represents a parameter metadata definition for UI rendering and validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamDefinition {
    pub name: String,
    pub description: String,
    pub param_type: String, // "number", "creature", "gameobject", "spell", "item", "quest", "sound", "emote", "text_group", "phase_mask", "bool"
    pub default_val: i64,
}

/// SmartScript Event Definition for HavenCore 8.3.7
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartEventDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub params: Vec<ParamDefinition>,
    pub string_param: Option<String>,
}

/// SmartScript Action Definition for HavenCore 8.3.7
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartActionDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub params: Vec<ParamDefinition>,
}

/// SmartScript Target Definition for HavenCore 8.3.7
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartTargetDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub params: Vec<ParamDefinition>,
    pub has_coords: bool,
}

/// Condition Source Type Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionSourceTypeDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub source_group_label: String,
    pub source_entry_label: String,
    pub source_id_label: String,
}

/// Condition Type Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionTypeDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub value1_label: String,
    pub value2_label: String,
    pub value3_label: String,
}

/// GameObject Type Definition with Data field names
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameObjectTypeDefinition {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub data_fields: Vec<String>,
}

/// Complete catalog of HavenCore BFA 8.3.7 definitions
pub struct BfaDefinitions;

impl BfaDefinitions {
    pub fn get_smart_events() -> Vec<SmartEventDefinition> {
        vec![
            SmartEventDefinition {
                id: 0,
                name: "SMART_EVENT_UPDATE_IC".into(),
                description: "Triggers periodically while in combat.".into(),
                params: vec![
                    ParamDefinition { name: "InitialMin".into(), description: "Minimum initial delay (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "InitialMax".into(), description: "Maximum initial delay (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "RepeatMin".into(), description: "Minimum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "RepeatMax".into(), description: "Maximum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 1,
                name: "SMART_EVENT_UPDATE_OOC".into(),
                description: "Triggers periodically while out of combat.".into(),
                params: vec![
                    ParamDefinition { name: "InitialMin".into(), description: "Minimum initial delay (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "InitialMax".into(), description: "Maximum initial delay (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "RepeatMin".into(), description: "Minimum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "RepeatMax".into(), description: "Maximum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 2,
                name: "SMART_EVENT_HEALT_PCT".into(),
                description: "Triggers when creature health percentage reaches the specified threshold.".into(),
                params: vec![
                    ParamDefinition { name: "HPMin%".into(), description: "Minimum HP percent".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "HPMax%".into(), description: "Maximum HP percent".into(), param_type: "number".into(), default_val: 100 },
                    ParamDefinition { name: "RepeatMin".into(), description: "Minimum repeat cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "RepeatMax".into(), description: "Maximum repeat cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 3,
                name: "SMART_EVENT_MANA_PCT".into(),
                description: "Triggers when creature mana percentage reaches the specified threshold.".into(),
                params: vec![
                    ParamDefinition { name: "ManaMin%".into(), description: "Minimum Mana percent".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "ManaMax%".into(), description: "Maximum Mana percent".into(), param_type: "number".into(), default_val: 100 },
                    ParamDefinition { name: "RepeatMin".into(), description: "Minimum repeat cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "RepeatMax".into(), description: "Maximum repeat cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 4,
                name: "SMART_EVENT_AGGRO".into(),
                description: "Triggers on creature enter combat / aggro.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 5,
                name: "SMART_EVENT_KILL".into(),
                description: "Triggers when creature kills a unit.".into(),
                params: vec![
                    ParamDefinition { name: "CooldownMin".into(), description: "Minimum cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMax".into(), description: "Maximum cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "PlayerOnly".into(), description: "1 = player only, 0 = any".into(), param_type: "bool".into(), default_val: 0 },
                    ParamDefinition { name: "CreatureEntry".into(), description: "Creature Entry (0 = any)".into(), param_type: "creature".into(), default_val: 0 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 6,
                name: "SMART_EVENT_DEATH".into(),
                description: "Triggers when the creature dies.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 7,
                name: "SMART_EVENT_EVADE".into(),
                description: "Triggers when the creature evades combat.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 8,
                name: "SMART_EVENT_SPELLHIT".into(),
                description: "Triggers when the creature is hit by a spell.".into(),
                params: vec![
                    ParamDefinition { name: "SpellID".into(), description: "Spell ID (0 = any)".into(), param_type: "spell".into(), default_val: 0 },
                    ParamDefinition { name: "School".into(), description: "Spell School Mask (0 = any)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMin".into(), description: "Minimum cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMax".into(), description: "Maximum cooldown (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 9,
                name: "SMART_EVENT_RANGE".into(),
                description: "Triggers when creature is within range of target.".into(),
                params: vec![
                    ParamDefinition { name: "MinDist".into(), description: "Minimum distance".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "MaxDist".into(), description: "Maximum distance".into(), param_type: "number".into(), default_val: 30 },
                    ParamDefinition { name: "RepeatMin".into(), description: "Minimum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "RepeatMax".into(), description: "Maximum repeat interval (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 10,
                name: "SMART_EVENT_OOC_LOS".into(),
                description: "Triggers on unit seen in Line of Sight while out of combat.".into(),
                params: vec![
                    ParamDefinition { name: "NoHostile".into(), description: "0 = Hostile only, 1 = Non-hostile only, 2 = Any".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "MaxRange".into(), description: "Max distance in yards".into(), param_type: "number".into(), default_val: 20 },
                    ParamDefinition { name: "CooldownMin".into(), description: "Minimum cooldown (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "CooldownMax".into(), description: "Maximum cooldown (ms)".into(), param_type: "number".into(), default_val: 1000 },
                    ParamDefinition { name: "Unused".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 11,
                name: "SMART_EVENT_RESPAWN".into(),
                description: "Triggers on creature respawn.".into(),
                params: vec![
                    ParamDefinition { name: "Type".into(), description: "0 = all, 1 = Map, 2 = Zone/Area".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "MapID".into(), description: "Map ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "ZoneID".into(), description: "Zone/Area ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 19,
                name: "SMART_EVENT_ACCEPTED_QUEST".into(),
                description: "Triggers when a player accepts the specified quest.".into(),
                params: vec![
                    ParamDefinition { name: "QuestID".into(), description: "Quest ID (0 = any)".into(), param_type: "quest".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMin".into(), description: "Cooldown Min (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMax".into(), description: "Cooldown Max (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 20,
                name: "SMART_EVENT_REWARD_QUEST".into(),
                description: "Triggers when a player turns in / is rewarded the quest.".into(),
                params: vec![
                    ParamDefinition { name: "QuestID".into(), description: "Quest ID (0 = any)".into(), param_type: "quest".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMin".into(), description: "Cooldown Min (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CooldownMax".into(), description: "Cooldown Max (ms)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 34,
                name: "SMART_EVENT_MOVEMENTINFORM".into(),
                description: "Triggers when creature reaches a movement waypoint or point.".into(),
                params: vec![
                    ParamDefinition { name: "MovementType".into(), description: "Movement Type (0 = any, 1 = POINT_MOTION_TYPE, etc.)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "PointID".into(), description: "Point ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 52,
                name: "SMART_EVENT_TEXT_OVER".into(),
                description: "Triggers when a creature_text entry finishes displaying.".into(),
                params: vec![
                    ParamDefinition { name: "GroupID".into(), description: "Creature Text Group ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "CreatureEntry".into(), description: "Creature entry that spoke (0 = self)".into(), param_type: "creature".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 62,
                name: "SMART_EVENT_GOSSIP_SELECT".into(),
                description: "Triggers when a player selects a gossip menu option.".into(),
                params: vec![
                    ParamDefinition { name: "MenuID".into(), description: "Gossip Menu ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "ActionID".into(), description: "Gossip Option ID / Index".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 64,
                name: "SMART_EVENT_GOSSIP_HELLO".into(),
                description: "Triggers when a player clicks/interacts with the NPC or GameObject.".into(),
                params: vec![
                    ParamDefinition { name: "NoReportUse".into(), description: "For GOs: 0 = report use, 1 = don't report".into(), param_type: "bool".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 78,
                name: "SMART_EVENT_SCENE_START".into(),
                description: "BFA: Triggers when a cinematic scene begins playback.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
            SmartEventDefinition {
                id: 79,
                name: "SMART_EVENT_SCENE_TRIGGER".into(),
                description: "BFA: Triggers when a named trigger is fired inside a scene script.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: Some("TriggerName".into()),
            },
            SmartEventDefinition {
                id: 81,
                name: "SMART_EVENT_SCENE_COMPLETE".into(),
                description: "BFA: Triggers when a cinematic scene finishes.".into(),
                params: vec![
                    ParamDefinition { name: "Unused1".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
                string_param: None,
            },
        ]
    }

    pub fn get_smart_actions() -> Vec<SmartActionDefinition> {
        vec![
            SmartActionDefinition {
                id: 1,
                name: "SMART_ACTION_TALK".into(),
                description: "Creature speaks text from creature_text group.".into(),
                params: vec![
                    ParamDefinition { name: "GroupID".into(), description: "Group ID from creature_text".into(), param_type: "text_group".into(), default_val: 0 },
                    ParamDefinition { name: "Duration".into(), description: "Duration in ms to wait before next text".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "UseTalkTarget".into(), description: "1 = use target as whisper receiver, 0 = say to all".into(), param_type: "bool".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 11,
                name: "SMART_ACTION_CAST".into(),
                description: "Casts a spell on target.".into(),
                params: vec![
                    ParamDefinition { name: "SpellID".into(), description: "Spell ID".into(), param_type: "spell".into(), default_val: 0 },
                    ParamDefinition { name: "CastFlags".into(), description: "Cast Flags (1=InterruptPrevious, 2=Triggered, 4=ForceCast, etc.)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "TriggerFlags".into(), description: "Trigger Flags".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "TargetsLimit".into(), description: "Targets Limit (0 = all)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 12,
                name: "SMART_ACTION_SUMMON_CREATURE".into(),
                description: "Spawns a creature at target position.".into(),
                params: vec![
                    ParamDefinition { name: "CreatureID".into(), description: "Creature Template Entry".into(), param_type: "creature".into(), default_val: 0 },
                    ParamDefinition { name: "SummonType".into(), description: "Summon Type (1=TimedDespawn, 2=TimedDespawnOOC, 3=TimedOrCorpseDespawn, 4=TimedOrDeadDespawn, 5=CorpseDespawn, 6=CorpseTimedDespawn, 7=DeadDespawn, 8=ManualDespawn)".into(), param_type: "number".into(), default_val: 1 },
                    ParamDefinition { name: "Duration".into(), description: "Duration in milliseconds".into(), param_type: "number".into(), default_val: 60000 },
                    ParamDefinition { name: "AttackInvoker".into(), description: "1 = attack invoker immediately, 0 = default".into(), param_type: "bool".into(), default_val: 0 },
                    ParamDefinition { name: "IsPersonal".into(), description: "BFA: 1 = summoned personal visibility, 0 = visible to all".into(), param_type: "bool".into(), default_val: 0 },
                    ParamDefinition { name: "Data".into(), description: "Custom data pass".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 80,
                name: "SMART_ACTION_CALL_TIMED_ACTIONLIST".into(),
                description: "Executes a Timed ActionList (ScriptType 9).".into(),
                params: vec![
                    ParamDefinition { name: "ActionListID".into(), description: "Timed ActionList Entry ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "StopAfterCombat".into(), description: "0 = continue after combat, 1 = cancel after combat".into(), param_type: "bool".into(), default_val: 1 },
                    ParamDefinition { name: "TimerUpdateType".into(), description: "0 = OOC only, 1 = IC only, 2 = Always".into(), param_type: "number".into(), default_val: 2 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 128,
                name: "SMART_ACTION_PLAY_ANIMKIT".into(),
                description: "BFA: Plays an AnimKit ID on creature.".into(),
                params: vec![
                    ParamDefinition { name: "AnimKitID".into(), description: "AnimKit.db2 ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "AnimType".into(), description: "0 = OneShot, 1 = AIAnim, 2 = MeleeAnim, 3 = MovementAnim".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 129,
                name: "SMART_ACTION_SCENE_PLAY".into(),
                description: "BFA: Starts playback of scene_template.".into(),
                params: vec![
                    ParamDefinition { name: "SceneID".into(), description: "Scene Template ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 139,
                name: "SMART_ACTION_SAY".into(),
                description: "BFA: Speeches BroadcastText directly with speech bubble.".into(),
                params: vec![
                    ParamDefinition { name: "Type".into(), description: "0 = Say, 1 = Yell".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "BroadcastTextID".into(), description: "BroadcastText ID from hotfixes".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Duration".into(), description: "Duration in ms".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Target".into(), description: "Target Receiver".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 206,
                name: "SMART_ACTION_START_CONVERSATION".into(),
                description: "BFA: Triggers a multi-actor conversation (conversation_template).".into(),
                params: vec![
                    ParamDefinition { name: "ConversationID".into(), description: "Conversation Template ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused2".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
            SmartActionDefinition {
                id: 1005,
                name: "SMART_ACTION_ENTER_LFG_QUEUE".into(),
                description: "BFA HavenCore: Enters player target into LFG dungeon queue.".into(),
                params: vec![
                    ParamDefinition { name: "DungeonID".into(), description: "LFGDungeons.db2 ID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "RoleMask".into(), description: "Role Bitmask (1=Tank, 2=Healer, 4=DPS)".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused3".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused4".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused5".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Unused6".into(), description: "Unused".into(), param_type: "number".into(), default_val: 0 },
                ],
            },
        ]
    }

    pub fn get_smart_targets() -> Vec<SmartTargetDefinition> {
        vec![
            SmartTargetDefinition {
                id: 0,
                name: "SMART_TARGET_NONE".into(),
                description: "Default invoker target.".into(),
                params: vec![],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 1,
                name: "SMART_TARGET_SELF".into(),
                description: "The source creature or gameobject itself.".into(),
                params: vec![],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 2,
                name: "SMART_TARGET_VICTIM".into(),
                description: "Current combat victim / highest threat target.".into(),
                params: vec![],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 7,
                name: "SMART_TARGET_ACTION_INVOKER".into(),
                description: "The unit that triggered this event (player that clicked, spellcaster, etc.).".into(),
                params: vec![],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 8,
                name: "SMART_TARGET_POSITION".into(),
                description: "Exact coordinates specified in TargetX, TargetY, TargetZ, TargetO.".into(),
                params: vec![],
                has_coords: true,
            },
            SmartTargetDefinition {
                id: 10,
                name: "SMART_TARGET_CREATURE_GUID".into(),
                description: "Specific creature by database spawn GUID and template entry.".into(),
                params: vec![
                    ParamDefinition { name: "GUID".into(), description: "Creature Spawn GUID".into(), param_type: "number".into(), default_val: 0 },
                    ParamDefinition { name: "Entry".into(), description: "Creature Entry".into(), param_type: "creature".into(), default_val: 0 },
                ],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 19,
                name: "SMART_TARGET_CLOSEST_CREATURE".into(),
                description: "Closest creature of entry within max distance.".into(),
                params: vec![
                    ParamDefinition { name: "CreatureEntry".into(), description: "Creature Entry (0 = any)".into(), param_type: "creature".into(), default_val: 0 },
                    ParamDefinition { name: "MaxDist".into(), description: "Maximum distance".into(), param_type: "number".into(), default_val: 30 },
                    ParamDefinition { name: "Dead".into(), description: "0 = Alive only, 1 = Dead only".into(), param_type: "bool".into(), default_val: 0 },
                ],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 21,
                name: "SMART_TARGET_CLOSEST_PLAYER".into(),
                description: "Closest player within max distance.".into(),
                params: vec![
                    ParamDefinition { name: "MaxDist".into(), description: "Maximum distance".into(), param_type: "number".into(), default_val: 30 },
                ],
                has_coords: false,
            },
            SmartTargetDefinition {
                id: 100,
                name: "SMART_TARGET_INVOKER_SUMMON".into(),
                description: "BFA HavenCore: Creature summoned by event invoker.".into(),
                params: vec![
                    ParamDefinition { name: "CreatureEntry".into(), description: "Creature Entry".into(), param_type: "creature".into(), default_val: 0 },
                ],
                has_coords: false,
            },
        ]
    }
}
