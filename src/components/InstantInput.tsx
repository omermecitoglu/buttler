"use client";
import { kebabCase } from "change-case";
import React, { useState } from "react";
import Form from "react-bootstrap/Form";

type InstantInputProps = {
  title: string,
  defaultValue?: string,
  action: (value: string) => Promise<unknown>,
};

const InstantInput = ({
  title,
  defaultValue = "",
  action,
}: InstantInputProps) => {
  const [inputText, setInputText] = useState(defaultValue);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleChange = async (text: string) => {
    setInputText(text);
    setIsDisabled(true);
    await action(text);
    setIsDisabled(false);
  };

  return (
    <Form.Group controlId={kebabCase(title)}>
      <Form.Label>{title}</Form.Label>
      <Form.Control
        name={kebabCase(title)}
        value={inputText}
        onChange={e => handleChange(e.target.value)}
        readOnly={isDisabled}
        isInvalid={isDisabled}
        isValid={!isDisabled}
      />
    </Form.Group>
  );
};

export default InstantInput;
