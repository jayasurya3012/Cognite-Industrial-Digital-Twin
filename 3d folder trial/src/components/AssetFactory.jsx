import Separator from "./assets/Separator";
import Heater from "./assets/Heater";
import Pump from "./assets/Pump";
import Valve from "./assets/Valve";
import Sensor from "./Sensor";
import data from "../data.json";

const sensorsForAsset = (assetId) =>
  data.sensors.filter((s) => s.attached_to === assetId);

export default function AssetFactory({ asset }) {
  const { id, position } = asset;

  const pos = [
    position.x * 0.01,
    0,
    position.y * 0.01
  ];

  let component = null;

  if (id.startsWith("V-")) component = <Separator position={pos} name={id} />;
  else if (id.startsWith("E-")) component = <Heater position={pos} name={id} />;
  else if (id.startsWith("P-")) component = <Pump position={pos} name={id} />;
  else if (id.includes("CV") || id.includes("DV") || id.includes("SV"))
    component = <Valve position={pos} name={id} />;

  return (
    <>
      {component}

      {/* Sensors */}
      {sensorsForAsset(id).map((s, i) => (
        <Sensor
          key={i}
          position={[
            s.position.x * 0.02,
            2,
            s.position.y * 0.02
          ]}
        />
      ))}
    </>
  );
}