"use client";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import StatusEmitter from "@omer-x/bs-ui-kit/form/StatusEmitter";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
import classNames from "classnames";
import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import type { ButtonVariant } from "react-bootstrap/types";

type ModalListProps = {
  buttonVariant?: ButtonVariant,
  buttonStretched?: boolean,
  buttonSize?: "lg" | "sm",
  buttonIcon?: IconProp,
  buttonText?: string,
  title: string,
  collection: Record<string, string>,
  emptyWarning: string,
  action: (itemId: string, _: FormData) => Promise<void>,
};

const ModalList = ({
  buttonVariant = "primary",
  buttonStretched = false,
  buttonSize,
  buttonIcon,
  buttonText,
  title,
  collection,
  emptyWarning,
  action,
}: ModalListProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <ActionButton
        variant={buttonVariant}
        size={buttonSize}
        icon={buttonIcon}
        text={buttonText}
        stretched={buttonStretched}
        onClick={() => setIsModalOpen(true)}
      />
      <Modal scrollable show={isModalOpen} onHide={() => setIsModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(collection).length ? (
            <Table className="mb-0">
              <tbody>
                {Object.entries(collection).map(([itemId, itemName], index, items) => (
                  <tr key={itemId}>
                    <td
                      valign="middle"
                      className={classNames({
                        "pt-0": index === 0,
                        "pb-0 border-bottom-0": index === items.length - 1,
                      })}
                    >
                      {itemName}
                    </td>
                    <td
                      className={classNames("text-end", {
                        "pt-0": index === 0,
                        "pb-0 border-bottom-0": index === items.length - 1,
                      })}
                    >
                      <form action={action.bind(null, itemId)}>
                        <StatusEmitter onComplete={() => setIsModalOpen(false)} />
                        <SubmitButton
                          size="sm"
                          text="Connect"
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <span className="text-muted fst-italic">{emptyWarning}</span>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ModalList;
