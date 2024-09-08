import "highlight.js/styles/default.css";
import Highlight from "react-highlight";

type BashLogsProps = {
  content: string,
};

const BashLogs = ({
  content,
}: BashLogsProps) => (
  <Highlight className="bash">
    {content}
  </Highlight>
);

export default BashLogs;
