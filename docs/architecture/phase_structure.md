## Phase Sequence
1. Upkeep
2. Events
3. Tactics
4. Fast Skills
5. Enemy Phase
6. Slow Skills
7. End of Round

## Phases with Subphases
### 1. Upkeep
+ **Description:** Doom increases, effects on Mission and Agenda cards might trigger, special enemy and convict effects that trigger in upkeep phase
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
 + Next phase can only be triggered when this phase has been completed. 
+ no subphases
### 2. Events
+ **Description:** Players draw 1 Event card per convict in play. Usually the event card determines the enemy behavior in the enemy phase and spawns new enemies. However, depending on the Event card different effects can be triggered in addition or instead (e.g. Doom increases, a test needs to be performed). Convicts might play cards from their hand to modify tests. 
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
+ Next phase can only be triggered when this phase has been completed for all convicts. 
+ no subphases

### 3. Tactics
+ **Description**: Players select a tactic for each convict for the round and trigger the effects of that tactic. Then each player selects skill cards from their hand, to be played later in this the round. 
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
+ Next phase can only be triggered when this phase has been completed for all convicts. 
- **Subphases**:
	- 3.1. Select Tactic
	- 3.2. Select Skill Cards
### 4. Fast Skills
+ **Description**: Convicts play fast Skill cards from their active area and trigger effects and perform tests. Convicts might play cards from their hand to modify tests.
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
+ Next phase can only be triggered when this phase has been completed for all convicts. 
+ no subphases
### 5. Enemy Phase
+ **Description**: Players perform enemy actions as displayed on Enemy cards for the enemies activated by the drawn Event cards. 
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
+ Next phase can only be triggered when this phase has been completed for all convicts. 
+ no subphases
### 6. Slow Skills
+ **Description**: Convicts play slow Skill cards from their active area and trigger effects and perform tests. Convicts might play cards from their hand to modify tests.
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
+ Next phase can only be triggered when this phase has been completed for all convicts. 
+ no subphases
### 7. End of Round
+ **Description:** Special effects that trigger in this phase take effect
+ **Effects:** will not be automated in the app at the moment but manually performed by the user, at later stages of app development, on some effects might be automated.
 + End of Round and Start of next round can only be triggered when this phase has been completed for all convicts. 
+ no subphases

  ## Phase-Specific UI Needs (for planning)
  - All phases need notifications displayed in the notification panel centered at the left side of the viewport. For phases with a subphase, a second notification will be displayed in addition to the general one for the parent phase.
  - All phases need special buttons displayed in the advance phase panel centered at the right side of the viewport. Each convict needs to activate these buttons before the round to advances to the next the phase. For phases with a subphase, convicts may advance to the next subphase even if other convicts have not done so. However, advancement of parent phases can only be performed if all convicts have confirmed that they finished the current phase.
  - All notifications and buttons have phase specific texts.
  - Phase specific GUI modifications:
	  - active-section is off by default
	  - 2. Events: show Event window located below the deck-strip of the top-bar, Events with tests trigger Test window (GUI location to be determined)
	  - 3.1 Select Tactic: show tactics window at the position that the active-section has
	  - 3.2 Select Skill Cards: replace tactics window with active-section, already implemented: highlight cards in hand-section and click moves them to the active-section
	  - 4 Fast Skills: highlight of cards in hand section off, highlight of cards in active section on, click to discard function. tests trigger Test window (GUI location to be determined) 
	  - 5. Enemy: show Enemy cards window located below the deck-strip of the top-bar (reuse Event window?), Enemy cards might trigger tests the trigger Test window (GUI location to be determined)
	  - 6. Slow Skills: highlight of cards in active section on, click to discard function. tests trigger Test window (GUI location to be determined) 