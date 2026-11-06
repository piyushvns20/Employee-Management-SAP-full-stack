sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Messaging",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, Messaging, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) => {
    "use strict";

    const GROUP = "employeeGroup";

    return Controller.extend("employeemgntui.controller.View1", {
        onInit() {
            this.getView().setModel(new JSONModel({
                tableTitle: this._text("employeesTitle"),
                dialogTitle: ""
            }), "view");
        },

        // ---- Read ----

        onUpdateFinished(oEvent) {
            const iCount = oEvent.getSource().getBinding("items").getCount();
            const sTitle = iCount === undefined
                ? this._text("employeesTitle")
                : this._text("employeesTitleCount", [iCount]);
            this.getView().getModel("view").setProperty("/tableTitle", sTitle);
        },

        onSearch(oEvent) {
            const sQuery = (oEvent.getParameter("newValue") ?? oEvent.getParameter("query") ?? "").trim();
            const aFilters = sQuery ? [new Filter({
                filters: ["employeeCode", "firstName", "lastName", "email", "designation"].map(sPath =>
                    new Filter({ path: sPath, operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false })),
                and: false
            })] : [];
            this._getTableBinding().filter(aFilters);
        },

        formatStatusState(sStatus) {
            return { Active: "Success", Inactive: "Warning", Terminated: "Error" }[sStatus] ?? "None";
        },

        // ---- Create / Update ----

        onAdd() {
            const oContext = this._getTableBinding().create({ status: "Active" }, false, false);
            this._openDialog(oContext, this._text("createTitle"));
        },

        onEdit(oEvent) {
            this._openDialog(oEvent.getSource().getBindingContext(), this._text("editTitle"));
        },

        async onSave() {
            const oModel = this.getView().getModel();
            const oContext = this._oDialog.getBindingContext();
            const bNew = oContext.isTransient();

            Messaging.removeAllMessages();
            this._oDialog.setBusy(true);
            try {
                await oModel.submitBatch(GROUP);
            } finally {
                this._oDialog.setBusy(false);
            }

            // Failed requests stay pending and their errors are reported to the message model
            if (oModel.hasPendingChanges(GROUP)) {
                this._showErrors();
                return;
            }
            if (!bNew) {
                // Re-read the expanded department/manager so the table shows the new names
                oContext.requestSideEffects([
                    { $NavigationPropertyPath: "department" },
                    { $NavigationPropertyPath: "manager" }
                ]);
            }
            this._oDialog.close();
            MessageToast.show(this._text(bNew ? "createSuccess" : "updateSuccess"));
        },

        onCancel() {
            this._oDialog.close();
        },

        onDialogAfterClose() {
            // Discards unsaved edits and removes a not-yet-saved new employee (also on Escape)
            this.getView().getModel().resetChanges(GROUP);
            Messaging.removeAllMessages();
            this._oDialog.setBindingContext(null);
        },

        // ---- Delete ----

        onDelete(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const sName = `${oContext.getProperty("firstName")} ${oContext.getProperty("lastName")}`;

            MessageBox.confirm(this._text("deleteConfirm", [sName]), {
                emphasizedAction: MessageBox.Action.OK,
                onClose: async sAction => {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    try {
                        await oContext.delete("$auto");
                        MessageToast.show(this._text("deleteSuccess", [sName]));
                    } catch (oError) {
                        if (!oError.canceled) {
                            MessageBox.error(oError.message);
                        }
                    }
                }
            });
        },

        // ---- Helpers ----

        async _openDialog(oContext, sTitle) {
            this._oDialog ??= await this.loadFragment({ name: "employeemgntui.view.EmployeeDialog" });
            Messaging.removeAllMessages();
            this.getView().getModel("view").setProperty("/dialogTitle", sTitle);
            this._oDialog.setBindingContext(oContext);
            this._oDialog.open();
        },

        _showErrors() {
            const aErrors = Messaging.getMessageModel().getData().filter(oMsg => oMsg.getType() === "Error");
            const sDetails = aErrors.map(oMsg => oMsg.getMessage()).join("\n");
            MessageBox.error(sDetails || this._text("saveError"));
        },

        _getTableBinding() {
            return this.byId("employeeTable").getBinding("items");
        },

        _text(sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});
