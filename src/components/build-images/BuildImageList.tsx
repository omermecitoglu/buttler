import DataTable from "@omer-x/bs-ui-kit/DataTable";
import Link from "next/link";
import React from "react";
import { destroy } from "~/actions/build-image";
import type { BuildImageDTO } from "~/models/build-image";
import StatusBadge from "./StatusBadge";
import type z from "zod";

type BuildImageListProps = {
  collection: z.infer<typeof BuildImageDTO>[],
  currentImageId?: string | null,
};

const BuildImageList = ({
  collection,
  currentImageId = null,
}: BuildImageListProps) => (
  <DataTable
    link={Link}
    collection={collection}
    primaryKey="id"
    schema={{
      id: {
        header: "ID",
        wrapper: value => value,
      },
      status: {
        header: "Status",
        wrapper: (status, id) => <StatusBadge status={id === currentImageId ? "active" : status} />,
      },
      createdAt: {
        header: "Created at",
        wrapper: date => (
          <span>
            {new Date(date).toLocaleDateString("tr-TR")}
            {" • "}
            {new Date(date).toLocaleTimeString("tr-TR")}
          </span>
        ),
      },
    }}
    // editLink={pk => ""}
    destroyAction={destroy}
    destroyWarningTitle="Delete Image"
    destroyWarningDescription="Are you sure you want to delete this image?"
    destroyConfirmText="Confirm"
    destroyCancelText="Cancel"
    destroyDisabled={false}
  />
);

export default BuildImageList;
