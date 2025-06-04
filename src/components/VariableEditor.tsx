"use client";
import { faArrowRotateLeft } from "@fortawesome/free-solid-svg-icons/faArrowRotateLeft";
import { faBroom } from "@fortawesome/free-solid-svg-icons/faBroom";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import CardBody from "react-bootstrap/CardBody";
import CardHeader from "react-bootstrap/CardHeader";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import InputGroupText from "react-bootstrap/InputGroupText";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { v4 as uuidv4 } from "uuid";
import { parseEnvVariables } from "~/utils/parseEnvVariables";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

type VariableEditorProps = {
  title: string,
  type?: "number" | "text",
  icon: IconProp,
  keyPlaceholder?: string,
  valuePlaceholder?: string,
  name: string,
  defaultValue?: Record<string, string>,
  databaseVariables?: Record<string, string>,
};

const VariableEditor = ({
  title,
  type = "text",
  icon,
  keyPlaceholder,
  valuePlaceholder,
  name,
  defaultValue = {},
  databaseVariables = {},
}: VariableEditorProps) => {
  type Item = {
    id: string,
    key: string,
    value: string,
    multiLine: boolean,
  };
  const initialCollection = Object.keys(defaultValue).map<Item>(key => ({
    id: key,
    key,
    value: defaultValue[key],
    multiLine: defaultValue[key].includes("\n"),
  }));
  const [collection, setCollection] = useState<Item[]>(initialCollection);

  const finalValue = useMemo(() => {
    const record = Object.fromEntries(collection.map(item => (item.key ? [item.key, item.value] : [])));
    return JSON.stringify(record);
  }, [collection]);

  const addItem = () => {
    setCollection(c => [...c, {
      id: uuidv4(),
      key: "",
      value: "",
      multiLine: false,
    }]);
  };

  const removeItem = (itemId: string) => {
    setCollection(c => c.filter(item => item.id !== itemId));
  };

  const updateItemKey = (itemId: string, key: string) => {
    setCollection(c => c.map(item => (item.id === itemId ? { ...item, key } : item)));
  };

  const updateItemValue = (itemId: string, value: string) => {
    setCollection(c => c.map(item => (item.id === itemId ? { ...item, value } : item)));
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isAppleDevice = (/Mac|iPhone|iPad|iPod/).test(navigator.userAgent);
    const isPressingCtrl = isAppleDevice ? e.metaKey : e.ctrlKey;
    if (isPressingCtrl && e.key === "v") {
      e.preventDefault();
      const text = await (async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return null;
        }
      })();
      if (text) {
        if (text.includes("=")) {
          const newItems = Object.entries(parseEnvVariables(text)).map<Item>(line => {
            const [key, value] = line;
            const multiLine = value.startsWith('"') && value.endsWith('"');
            return {
              id: crypto.randomUUID(),
              key,
              value: multiLine ? JSON.parse(value) : value,
              multiLine,
            };
          });
          setCollection(c => {
            const lastItem = c[c.length - 1];
            if (!lastItem.key.length && !lastItem.value.length) {
              return [...c.slice(0, -1), ...newItems];
            }
            return [...c, ...newItems];
          });
        } else {
          const input = e.target as HTMLInputElement;
          input.value = text;
        }
      }
    }
  };

  const clear = () => {
    setCollection([]);
  };

  const revert = () => {
    setCollection(initialCollection);
  };

  const copy = async () => {
    try {
      const text = collection.map(item => `${item.key}=${item.value}`);
      await navigator.clipboard.writeText(text.join("\n"));
    } catch {
      // do nothing
    }
  };

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div>
          {title}
        </div>
        <div className="d-flex gap-2">
          <OverlayTrigger
            trigger={["click", "hover"]}
            placement="top"
            delay={{ show: Infinity, hide: 400 }}
            overlay={props => (
              <Tooltip id="button-tooltip" {...props}>
                Copied!
              </Tooltip>
            )}
          >
            <Button size="sm" variant="secondary" className="py-0 px-1" onClick={copy}>
              <FontAwesomeIcon icon={faCopy} className="fa-fw" />
            </Button>
          </OverlayTrigger>
          {collection.length > 0 ? (
            <Button size="sm" variant="secondary" className="py-0 px-1" onClick={clear}>
              <FontAwesomeIcon icon={faBroom} className="fa-fw" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="py-0 px-1" onClick={revert}>
              <FontAwesomeIcon icon={faArrowRotateLeft} className="fa-fw" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="d-flex flex-column gap-3">
        <input type="hidden" name={name} value={finalValue} />
        {Object.entries(databaseVariables).map(([key, value]) => (
          <InputGroup key={key} size="sm">
            <InputGroupText>
              <FontAwesomeIcon icon={faDatabase} size="lg" className="fa-fw" />
            </InputGroupText>
            <FormControl type={type} value={key} disabled />
            <FormControl type={type} value={value} disabled />
            <Button variant="danger" disabled>
              <FontAwesomeIcon icon={faXmark} size="lg" className="fa-fw" />
            </Button>
          </InputGroup>
        ))}
        {collection.map(item => (
          <InputGroup key={item.id} size="sm">
            <InputGroupText>
              <FontAwesomeIcon icon={icon} size="lg" className="fa-fw" />
            </InputGroupText>
            <FormControl
              type={type}
              value={item.key}
              onChange={e => updateItemKey(item.id, e.target.value)}
              placeholder={keyPlaceholder}
              onKeyDown={handleKeyDown}
              required
            />
            {item.multiLine && type === "text" ? (
              <FormControl
                as="textarea"
                rows={3}
                value={item.value}
                onChange={e => updateItemValue(item.id, e.target.value)}
                placeholder={valuePlaceholder}
                onKeyDown={handleKeyDown}
                required
              />
            ) : (
              <FormControl
                type={type}
                value={item.value}
                onChange={e => updateItemValue(item.id, e.target.value)}
                placeholder={valuePlaceholder}
                onKeyDown={handleKeyDown}
                required
              />
            )}
            <Button variant="danger" onClick={() => removeItem(item.id)}>
              <FontAwesomeIcon icon={faXmark} size="lg" className="fa-fw" />
            </Button>
          </InputGroup>
        ))}
        <Button variant="success" size="sm" onClick={addItem}>
          <FontAwesomeIcon icon={faPlus} size="lg" className="fa-fw" />
        </Button>
      </CardBody>
    </Card>
  );
};

export default VariableEditor;
