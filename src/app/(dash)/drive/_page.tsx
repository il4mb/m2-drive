"use client";

import Container from "@/components/Container";
import useLocalStorage from "@/components/hooks/useLocalstorage";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { createContextMenu } from "@/components/context-menu/ContextMenuItem";
import DriveRoot from "@/components/ui/drive/DriveRoot";
import ActionDivider from "@/components/ui/menu-actions/ActionDivider";
import ActionNewFolder from "@/components/ui/menu-actions/ActionNewFolder";
import { getColor } from "@/theme/colors";
import { alpha, Stack } from "@mui/material";
import { AlignJustify, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, FileDigit, Grid, } from "lucide-react";
import { useMemo } from "react";

type Payload = {
	layout: "grid" | "list";
	setLayout: (l: Payload["layout"]) => void;
	order: "asc" | "desc";
	setOrder: (s: Payload["order"]) => void;
	sort: "type" | "createdAt" | "updatedAt";
	setSort: (s: Payload["sort"]) => void;
};

const activeStyle = (active: boolean) =>
	active
		? {
			background: alpha(getColor("primary")[400], 0.3),
			"&:hover": {
				background: alpha(getColor("primary")[400], 0.3),
			},
		}
		: undefined;

export default function DrivePage() {
	const [layout, setLayout] = useLocalStorage<Payload["layout"]>("drive-layout", "list");
	const [order, setOrder] = useLocalStorage<Payload["order"]>("drive-order", "desc");
	const [sort, setSort] = useLocalStorage<Payload["sort"]>("drive-sort", "type");

	const payload: Payload = { layout, setLayout, order, setOrder, sort, setSort }

	// 🔹 Memoized menu list
	const MENU = useMemo(
		() => [
			ActionNewFolder,
			ActionDivider,

			createContextMenu<Payload>({
				icon: ({ payload, size }) =>
					payload.layout === "grid" ? (
						<AlignJustify size={size} />
					) : (
						<Grid size={size} />
					),
				label: ({ payload }) =>
					`${payload.layout === "grid" ? "List" : "Grid"} Layout`,
				action({ layout, setLayout }) {
					setLayout(layout === "grid" ? "list" : "grid");
					return false;
				},
			}),

			ActionDivider,

			createContextMenu<Payload>({
				icon: FileDigit,
				label: "Sort by Type",
				style: ({ sort }) => activeStyle(sort === "type"),
				action({ setSort }) {
					setSort("type");
					return false;
				},
			}),
			createContextMenu<Payload>({
				icon: Clock,
				label: "Sort by Update Time",
				style: ({ sort }) => activeStyle(sort === "updatedAt"),
				action({ setSort }) {
					setSort("updatedAt");
					return false;
				},
			}),
			createContextMenu<Payload>({
				icon: Clock,
				label: "Sort by Create Time",
				style: ({ sort }) => activeStyle(sort === "createdAt"),
				action({ setSort }) {
					setSort("createdAt");
					return false;
				},
			}),

			ActionDivider,

			createContextMenu<Payload>({
				icon: ({ payload, size }) =>
					payload.order === "desc" ? (
						<ArrowDownWideNarrow size={size} />
					) : (
						<ArrowUpNarrowWide size={size} />
					),
				label: ({ payload }) =>
					payload.order === "desc" ? "Order ASC" : "Order DESC",
				action({ setOrder, order }) {
					setOrder(order === "desc" ? "asc" : "desc");
					return false;
				},
			}),
		],
		[layout, order, sort]
	);

	return (
		<ContextMenu state={payload} menu={MENU} maxWidth={210}>
			<Stack flex={1} overflow={"hidden"}>
				<Container maxWidth="lg" scrollable>
					<DriveRoot
						layout={layout}
						order={order}
						sortBy={sort}
					/>
				</Container>
			</Stack>
		</ContextMenu>
	);
}
