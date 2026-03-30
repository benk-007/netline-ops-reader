import { useMemo } from "react";
import FlightGantt from "./FlightGantt";
import styles from "./StationGantt.module.scss";

/**
 * Wraps FlightGantt with station-scoped filtering.
 * Shows only aircraft with legs touching any of the user's assigned airports.
 */
export default function StationGantt({ legs, userAirports, ...rest }) {
  const stationLegs = useMemo(
    () => legs.filter(l => userAirports.includes(l.dep) || userAirports.includes(l.arr)),
    [legs, userAirports]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.stationBadge}>
        Station View: {userAirports.join(', ')}
      </div>
      <FlightGantt legs={stationLegs} {...rest} />
    </div>
  );
}
