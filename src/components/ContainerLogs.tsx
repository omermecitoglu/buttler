"use client";
import { faRefresh } from "@fortawesome/free-solid-svg-icons/faRefresh";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import React, { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import FormCheck from "react-bootstrap/FormCheck";
import FormSelect from "react-bootstrap/FormSelect";
import Modal from "react-bootstrap/Modal";
import BashLogs from "./BashLogs";

type ContainerLogsProps = {
  containerId: string,
};

const ContainerLogs = ({
  containerId,
}: ContainerLogsProps) => {
  const [show, setShow] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [limit, setLimit] = useState(100);
  const [wrap, setWrap] = useState(true);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  async function fetchLogs(signal: AbortSignal) {
    try {
      const url = new URL("/api/logs", window.location.origin);
      url.searchParams.append("container", containerId);
      url.searchParams.append("limit", limit.toString());
      const response = await fetch(url, { signal });
      const { content } = await response.json();
      setLogs(content);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!show || logs.length) return;
    const controller = new AbortController();
    fetchLogs(controller.signal);
  }, [show, logs, limit]);

  function refreshLogs() {
    setLogs("");
  }

  function handleLimitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLimit(parseInt(e.target.value));
    setLogs("");
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
        <Modal.Body className="pb-0">
          {logs.length ? (
            <BashLogs content={logs} wrap={wrap} />
          ) : (
            <div className="text-center">
              <FontAwesomeIcon size="2x" icon={faSpinner} className="fa-fw fa-spin-pulse" />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="me-3">
            <FormSelect aria-label="Select limit" onChange={handleLimitChange}>
              <option value="100">100</option>
              <option value="1000">1.000</option>
              <option value="10000">10.000</option>
            </FormSelect>
          </div>
          <FormCheck
            type="switch"
            id="custom-switch"
            label="Wrap long lines"
            className="me-auto"
            checked={wrap}
            onChange={e => setWrap(e.target.checked)}
          />
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
