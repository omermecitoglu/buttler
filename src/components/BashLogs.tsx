import useTheme from "@omer-x/bs-ui-kit/hooks/useTheme";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

type BashLogsProps = {
  content: string,
  wrap: boolean,
};

const BashLogs = ({
  content,
  wrap,
}: BashLogsProps) => {
  const theme = useTheme();
  return (
    <SyntaxHighlighter
      language="bash"
      style={theme === "dark" ? atomOneDark : atomOneLight}
      wrapLongLines={wrap}
    >
      {content}
    </SyntaxHighlighter>
  );
};

export default BashLogs;
