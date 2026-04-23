import "azure-devops-ui/Core/override.css";
import "./design.scss";

import { WorkItemOptions, WorkItemTrackingServiceIds, IWorkItemFormService } from "azure-devops-extension-api/WorkItemTracking/WorkItemTrackingServices";
import * as SDK from "azure-devops-extension-sdk";
import { Page } from "azure-devops-ui/Page";
import { SingleLayerMasterPanel, SingleLayerMasterPanelHeader } from "azure-devops-ui/MasterDetails";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { IListItemDetails, List, ListItem, ListSelection } from "azure-devops-ui/List";

import { ZeroData } from "azure-devops-ui/ZeroData";
import { useState, useEffect } from "react";

import * as ReactDOM from "react-dom";
import React = require("react");
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";


const FIGMA_RESOURCE_TYPES = new Set(["file", "proto", "design"]);
const RAW_URL_REGEX = /https:\/\/[^\s"'<>]+/g;

const normalizeUrl = (value: string): string => value.replace(/[),.;!?]+$/, "");

const isFigmaDesignUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();

        if (hostname !== "figma.com" && !hostname.endsWith(".figma.com")) {
            return false;
        }

        const [resourceType, fileKey] = url.pathname.split("/").filter(Boolean);
        return !!resourceType && FIGMA_RESOURCE_TYPES.has(resourceType) && !!fileKey;
    } catch {
        return false;
    }
};

const extractFigmaUrls = (description: string | null | undefined): string[] => {
    if (!description) {
        return [];
    }

    const urls = new Set<string>();
    const addUrl = (value: string | null | undefined): void => {
        if (!value) {
            return;
        }

        const normalizedUrl = normalizeUrl(value);
        if (isFigmaDesignUrl(normalizedUrl)) {
            urls.add(normalizedUrl);
        }
    };

    const doc = new DOMParser().parseFromString(description, "text/html");
    doc.querySelectorAll("a[href]").forEach((link) => addUrl(link.getAttribute("href")));

    const rawUrls = description.match(RAW_URL_REGEX) ?? [];
    rawUrls.forEach(addUrl);

    return Array.from(urls);
};

const Hub: React.FC<{}> = (props: any) => {
    const [designs, setDesigns] = useState([] as string[]);
    const [selectedItem, setSelectedItem] = useState(null as string | null);
    const [selection] = React.useState(new ListSelection({ selectOnFocus: false }));

    const [itemProvider, setItemProvider] = React.useState(new ArrayItemProvider(designs));

    useEffect(() => {
        SDK.init().then(async () => {
            SDK.register(SDK.getContributionId(), () => {
                return {
                    onLoaded: refreshDesigns,
                    onSaved: refreshDesigns,
                    onReset: refreshDesigns,
                    onRefreshed: refreshDesigns,
                    onFieldChanged: async (args: { changedFields?: string[] }) => {
                        if (!args.changedFields || args.changedFields.indexOf("System.Description") !== -1) {
                            await refreshDesigns();
                        }
                    }
                };
            });

            await refreshDesigns();
            SDK.notifyLoadSucceeded();
        });
    }, []);

    const refreshDesigns = async () => {
        const workItemFormService = await SDK.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
        const description = (await workItemFormService.getFieldValue("System.Description", ({} as WorkItemOptions)) as string | null);
        const urls = extractFigmaUrls(description);

        setDesigns(urls);
        setItemProvider(new ArrayItemProvider(urls));
        setSelectedItem((currentSelectedItem) => currentSelectedItem && urls.indexOf(currentSelectedItem) !== -1 ? currentSelectedItem : (urls[0] ?? null));
    };

    const renderHeader = () => {
        return <SingleLayerMasterPanelHeader title="Designs" />;
    };

    const renderContent = (selection: ListSelection, itemProvider: ArrayItemProvider<string>) => {
        return (
            <List
                ariaLabel={"List of Designs"}
                itemProvider={itemProvider}
                selection={selection}
                renderRow={renderListItem}
                width="100%"
                onFocus={(a, b) => setSelectedItem(b.data)}
                singleClickActivation={true}
            />
        );
    };

    const renderListItem = (
        index: number,
        item: string,
        details: IListItemDetails<string>,
        key?: string
    ): JSX.Element => {

        return (
            <ListItem
                className="master-example-row"
                key={key || "list-item" + index}
                index={index}
                details={details}
            >
                <div className="master-example-row-content flex-row flex-center h-scroll-hidden">
                    <Tooltip overflowOnly={true}>
                        <div className="primary-text text-ellipsis">{item}</div>
                    </Tooltip>
                </div>
            </ListItem>
        );
    };

    return (
        <Page className="flex-grow">
            {designs.length > 0 ?
                <div className="master-example-scroll-container flex-row">
                    <SingleLayerMasterPanel
                        className="master-example-panel show-on-small-screens"
                        renderHeader={renderHeader}
                        renderContent={() => renderContent(selection, itemProvider)}
                    />
                    {selectedItem != null ? <Page className="flex-grow single-layer-details">
                        <iframe className="design-frame" title="Figma design preview" src={`https://www.figma.com/embed?embed_host=azuredevops&url=${encodeURIComponent(selectedItem)}`} />
                    </Page> : <div></div>}

                </div> :
                <ZeroData imageAltText="No Designs Found" primaryText="No Designs Found..." secondaryText={<span>
                    Add design links in the description of the work item for them to show here.
                </span>} />}
        </Page>
    );

};

ReactDOM.render(<Hub />, document.getElementById("root"));
