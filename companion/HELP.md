# simSpeedCG NodeCG Replicants

This module connects Companion to a NodeCG bridge bundle.

## Expected NodeCG bridge

The NodeCG side should expose a Socket.IO namespace and the following events:

```txt
/simspeedcg-companion
replicant:snapshot
replicant:update
lowerThirdList
```

The module listens for `lowerThirdList` as an object with keys `1` through `10`.

Example payload:

```json
{
	"1": "Driver Intro",
	"2": "Race Director",
	"3": "Pit Reporter"
}
```

Missing entries are treated as blank.

## Lower third variables

The module defines these variables:

- `$(instance:lowerthird_1)`
- `$(instance:lowerthird_2)`
- `$(instance:lowerthird_3)`
- `$(instance:lowerthird_4)`
- `$(instance:lowerthird_5)`
- `$(instance:lowerthird_6)`
- `$(instance:lowerthird_7)`
- `$(instance:lowerthird_8)`
- `$(instance:lowerthird_9)`
- `$(instance:lowerthird_10)`

## Lower third presets

The module adds a `Lower Thirds` preset section with buttons `LT1` to `LT10`.

- Labels are generated from the latest `lowerThirdList` names.
- Each preset includes a placeholder `patch_replicant_path` action:
	- Bundle: `simSpeedCG`
	- Name: `lowerThirdControl`
	- Path: `selectedSlot`
	- Value: slot number (`1`-`10`)

Edit those action options to match your bridge write target.