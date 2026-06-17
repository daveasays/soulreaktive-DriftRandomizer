import {
  initialize,
  type ActivationContext,
  type Handle,
  MidiTrack,
  Device,
  DeviceParameter,
} from "@ableton-extensions/sdk";

import dialInterface from "./dial.html";

const EXCLUDED_PARAMS = new Set([
  "Device On",
  "Volume",
  "Transpose",
  "Osc 1 Oct",     // verrouillé — trop risqué
  "Osc 2 Oct",     // verrouillé — trop risqué
  "Voice Mode",    // verrouillé Poly
  "Legato On",     // verrouillé OFF
]);

const OSC_ON_PARAMS   = ["Osc 1 On", "Osc 2 On"];
const FILTER_ON_PARAMS = ["Osc 1 Flt On", "Osc 2 Flt On", "Noise Flt On"];
const NOISE_ON_PARAM  = "Noise On";

// -10dB = 0.5623, -20dB = 0.3162 — cible -12dB ≈ 0.50
const VOLUME_MAX = 0.50;

function randomizeParam(param: DeviceParameter<"1.0.0">, intensity: number): number {
  const range = param.max - param.min;
  if (param.isQuantized) {
    const items = param.valueItems;
    const count = items.length > 0 ? items.length : Math.round(range) + 1;
    const randomIndex = Math.floor(Math.random() * count);
    return param.min + randomIndex;
  }
  const center = (param.min + param.max) / 2;
  const targetRandom = param.min + Math.random() * range;
  return center + (targetRandom - center) * intensity;
}

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  context.commands.registerCommand("drift.randomize", async (arg: unknown) => {
    const handle = arg as Handle;
    const track = context.getObjectFromHandle(handle, MidiTrack);

    const driftDevices = track.devices.filter((d: Device<"1.0.0">) => {
      const names = new Set(d.parameters.map((p: DeviceParameter<"1.0.0">) => p.name));
      return names.has("Drift") && names.has("LP Freq") && names.has("Osc 1 Wave");
    });

    if (driftDevices.length === 0) {
      console.log(`[Drift Randomizer] Aucun Drift sur "${track.name}".`);
      return;
    }

    let result: string;
    try {
      result = await context.ui.showModalDialog(
        `data:text/html,${encodeURIComponent(dialInterface)}`,
        320,
        340
      );
    } catch {
      console.log("[Drift Randomizer] Annulé.");
      return;
    }

    const parsed = JSON.parse(result) as { intensity: number | null };
    if (parsed.intensity === null) {
      console.log("[Drift Randomizer] Annulé.");
      return;
    }

    const intensity = parsed.intensity;

    for (const device of driftDevices) {
      const allParams = device.parameters;

      const oscOnParams = allParams.filter(
        (p: DeviceParameter<"1.0.0">) => OSC_ON_PARAMS.includes(p.name)
      );
      const filterOnParams = allParams.filter(
        (p: DeviceParameter<"1.0.0">) => FILTER_ON_PARAMS.includes(p.name)
      );
      const noiseOnParam = allParams.find(
        (p: DeviceParameter<"1.0.0">) => p.name === NOISE_ON_PARAM
      );
      const volumeParam = allParams.find(
        (p: DeviceParameter<"1.0.0">) => p.name === "Volume"
      );
      const voiceModeParam = allParams.find(
        (p: DeviceParameter<"1.0.0">) => p.name === "Voice Mode"
      );
      const legatoParam = allParams.find(
        (p: DeviceParameter<"1.0.0">) => p.name === "Legato On"
      );
      const randomizableParams = allParams.filter(
        (p: DeviceParameter<"1.0.0">) =>
          !EXCLUDED_PARAMS.has(p.name) &&
          !OSC_ON_PARAMS.includes(p.name) &&
          !FILTER_ON_PARAMS.includes(p.name) &&
          p.name !== NOISE_ON_PARAM
      );

      await context.withinTransaction(() =>
        Promise.all([
          // 1. Randomiser tous les paramètres normaux
          ...randomizableParams.map(async (param: DeviceParameter<"1.0.0">) => {
            try {
              await param.setValue(randomizeParam(param, intensity));
            } catch (e) {
              console.log(`  ✗ ${param.name}: skipped (${e})`);
            }
          }),
          // 2. OSC On : 75% ON chacun
          ...oscOnParams.map(async (param: DeviceParameter<"1.0.0">) =>
            param.setValue(Math.random() < 0.25 ? 0 : 1)
          ),
          // 3. Filtres : 75% ON
          ...filterOnParams.map(async (param: DeviceParameter<"1.0.0">) =>
            param.setValue(Math.random() < 0.25 ? 0 : 1)
          ),
          // 4. Noise : 30% ON
          ...(noiseOnParam ? [noiseOnParam.setValue(Math.random() < 0.7 ? 0 : 1)] : []),
        ])
      );

      // 5. Garantir au moins un OSC allumé
      const oscOnValues = await Promise.all(
        oscOnParams.map((p: DeviceParameter<"1.0.0">) => p.getValue())
      );
      const anyOscOn = oscOnValues.some((v) => v > 0);
      if (!anyOscOn) {
        const osc1 = oscOnParams.find((p: DeviceParameter<"1.0.0">) => p.name === "Osc 1 On");
        if (osc1) await osc1.setValue(1);
        console.log("[Drift Randomizer] Aucun OSC actif — Osc 1 forcé à ON.");
      }

      // 6. Volume -12dB, Voice Mode Poly (0), Legato OFF
      if (volumeParam)    await volumeParam.setValue(VOLUME_MAX);
      if (voiceModeParam) await voiceModeParam.setValue(0);
      if (legatoParam)    await legatoParam.setValue(0);

      console.log(`[Drift Randomizer] ✓ "${track.name}" — ${Math.round(intensity * 100)}% — volume -12dB.`);
    }
  });

  context.ui.registerContextMenuAction(
    "MidiTrack",
    "Randomize Drift",
    "drift.randomize"
  );

  console.log("[Drift Randomizer] Activé.");
}
