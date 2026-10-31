import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  buildParams,
  definedOnly,
  cursorParams,
  limitParam,
  uuid,
} from "../utils.js";

const text = (max = 200) => z.string().max(max);

export function registerCounterpartyTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_validate_account_name",
    {
      title: "Validate Account Name (CoP/VoP)",
      description:
        "Validate a counterparty's account name against their account details before making a transfer. Supports UK (sort_code + account_no), EU/RO (IBAN), and AU (BSB + account_no).",
      inputSchema: {
        account_no: text(40).optional().describe("Account number (UK, AU)"),
        sort_code: text(20).optional().describe("Sort code (UK)"),
        iban: text(40).optional().describe("IBAN (EU, RO)"),
        bsb: text(20).optional().describe("BSB code (AU)"),
        recipient_country: text(2)
          .optional()
          .describe("Recipient country ISO code (EU, RO)"),
        recipient_currency: text(3).optional().describe("Recipient currency (EU, RO)"),
        individual_name: text().optional().describe("Individual name to validate"),
        company_name: text().optional().describe("Company name to validate"),
      },
    },
    async (params) => {
      logToolCall("revolut_validate_account_name", params);
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/account-name-validation", definedOnly(params))
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_counterparties",
    {
      title: "List Counterparties",
      description:
        "Retrieve a list of counterparties with optional filtering by name, account number, IBAN, or BIC. Supports cursor-based pagination via created_before; a note is added when a full page came back.",
      inputSchema: {
        name: text().optional().describe("Filter by name (partial match)"),
        account_no: text(40).optional().describe("Filter by account number"),
        sort_code: text(20)
          .optional()
          .describe("Filter by sort code (use with account_no)"),
        iban: text(40).optional().describe("Filter by IBAN"),
        bic: text(20).optional().describe("Filter by BIC (use with iban)"),
        ...cursorParams,
        limit: limitParam(1000),
      },
    },
    async (params) => {
      logToolCall("revolut_list_counterparties", params);
      try {
        const result = await client.get("/api/1.0/counterparties", buildParams(params));
        return listResponse(result, {
          limit: params.limit,
          cursorParam: "created_before",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_create_counterparty",
    {
      title: "Create Counterparty",
      description:
        "Create a new counterparty. For Revolut users, provide name + revtag. For external accounts, provide banking details (IBAN, account_no, etc.).",
      inputSchema: {
        company_name: text().optional().describe("Company name"),
        individual_name: z
          .object({
            first_name: text().describe("First name"),
            last_name: text().describe("Last name"),
          })
          .optional()
          .describe("Individual name object"),
        name: text().optional().describe("Name for Revolut counterparty (with revtag)"),
        profile_type: z
          .enum(["personal", "business"])
          .optional()
          .describe("Profile type"),
        revtag: text(50).optional().describe("Revtag for Revolut counterparties"),
        account_no: text(40).optional().describe("Account number"),
        iban: text(40).optional().describe("IBAN"),
        sort_code: text(20).optional().describe("Sort code"),
        routing_number: text(20).optional().describe("Routing number"),
        bic: text(20).optional().describe("BIC/SWIFT code"),
        clabe: text(20).optional().describe("CLABE (Mexico)"),
        ifsc: text(20).optional().describe("IFSC code (India)"),
        bsb_code: text(20).optional().describe("BSB code (Australia)"),
        bank_country: text(2).optional().describe("Bank country ISO code"),
        currency: text(3).optional().describe("Currency code"),
        address: z
          .object({
            street_line1: text().optional(),
            street_line2: text().optional(),
            region: text().optional(),
            city: text().optional(),
            country: text(2),
            postcode: text(20),
          })
          .optional()
          .describe("Address of the counterparty"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_counterparty", params);
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/counterparty", definedOnly(params))
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_counterparty",
    {
      title: "Get Counterparty",
      description:
        "Retrieve details of a specific counterparty, including their accounts and cards.",
      inputSchema: { counterparty_id: uuid.describe("The counterparty ID (UUID)") },
    },
    async ({ counterparty_id }) => {
      logToolCall("revolut_get_counterparty", { counterparty_id });
      try {
        return jsonResponse(await client.get(`/api/1.0/counterparty/${counterparty_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_delete_counterparty",
    {
      title: "Delete Counterparty",
      description: "Delete an existing counterparty by ID.",
      inputSchema: { counterparty_id: uuid.describe("The counterparty ID (UUID)") },
    },
    async ({ counterparty_id }) => {
      logToolCall("revolut_delete_counterparty", { counterparty_id });
      try {
        await client.deleteReq(`/api/1.0/counterparty/${counterparty_id}`);
        return jsonResponse({ success: true, message: "Counterparty deleted" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
