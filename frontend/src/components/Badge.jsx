const KINDS = {
  OFFICIAL_DOCUMENTED: ["off", "OFFICIAL DOCUMENTED"],
  SOURCE_DERIVED: ["src", "SOURCE-DERIVED"],
  RUN_TESTED_LOCALLY: ["run", "RUN / TESTED LOCALLY"],
  SIMULATED_DEMO: ["sim", "SIMULATED DEMO"],
  PROPOSED_UNVALIDATED: ["pro", "PROPOSED / UNVALIDATED"],
};

export default function Badge(props) {
  const kind = KINDS[props.kind] || KINDS.PROPOSED_UNVALIDATED;
  return <span className={"badge " + kind[0]}>{props.text || kind[1]}</span>;
}
