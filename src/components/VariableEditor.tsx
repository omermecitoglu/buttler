"use client";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import { CardBody, CardHeader } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import InputGroupText from "react-bootstrap/InputGroupText";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

type VariableEditorProps = {
  title: string,
  type?: "number" | "text",
  icon: IconProp,
  keyPlaceholder?: string,
  name: string,
  defaultValue?: Record<string, string>,
};

const VariableEditor = ({
  title,
  type = "text",
  icon,
  keyPlaceholder,
  name,
  defaultValue = {},
}: VariableEditorProps) => {
  const initialCollection = Object.keys(defaultValue).map(key => ({ id: key, key, value: defaultValue[key] }));
  const [collection, setCollection] = useState<{ id: string, key: string, value: string }[]>(initialCollection);

  const finalValue = useMemo(() => {
    const record = Object.fromEntries(collection.map(item => (item.key ? [item.key, item.value] : [])));
    return JSON.stringify(record);
  }, [collection]);

  const addItem = () => {
    setCollection(c => [...c, {
      id: crypto.randomUUID(),
      key: "",
      value: "",
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

  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody className="d-flex flex-column gap-3">
        <input type="hidden" name={name} value={finalValue} />
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
              required
            />
            <FormControl
              type={type}
              value={item.value}
              onChange={e => updateItemValue(item.id, e.target.value)}
              required
            />
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
