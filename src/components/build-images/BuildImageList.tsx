import DataTable from "@omer-x/bs-ui-kit/DataTable";
import Link from "next/link";
import React from "react";
import { destroy } from "~/actions/build-image";
import type { BuildImageDTO } from "~/models/build-image";
import type z from "zod";

type BuildImageListProps = {
  collection: z.infer<typeof BuildImageDTO>[],
};

const BuildImageList = ({
  collection,
}: BuildImageListProps) => (
  <DataTable
    link={Link}
    collection={collection}
    primaryKey="id"
    schema={{
      id: {
        header: "ID",
        wrapper: value => value,
        long: true,
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
