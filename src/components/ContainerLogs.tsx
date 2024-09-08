"use client";
import { faRefresh } from "@fortawesome/free-solid-svg-icons/faRefresh";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import React, { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

type ContainerLogsProps = {
  containerId: string,
};

const ContainerLogs = ({
  containerId,
}: ContainerLogsProps) => {
  const [show, setShow] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  async function fetchLogs() {
    try {
      const url = new URL("/api/logs", window.location.origin);
      url.searchParams.append("container", containerId);
      const response = await fetch(url);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (show && !logs.length) {
      fetchLogs();
    }
  }, [show]);

  function refreshLogs() {
    setLogs([]);
    fetchLogs();
  }

  return (
    <>
      <Button variant="link" size="sm" onClick={handleShow} className="p-0">
        {containerId}
      </Button>
      <Modal size="xl" scrollable show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Container logs</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!logs.length && (
            <div className="text-center">
              <FontAwesomeIcon size="2x" icon={faSpinner} className="fa-fw fa-spin-pulse" />
            </div>
          )}
          {logs.map((log, index) => (
            <p key={index}>
              {log}
            </p>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <ActionButton icon={faRefresh} text="Refresh" onClick={refreshLogs} />
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ContainerLogs;
