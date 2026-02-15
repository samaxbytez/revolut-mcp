import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

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
        account_no: z
          .string()
          .optional()
          .describe("Account number (UK, AU)"),
        sort_code: z.string().optional().describe("Sort code (UK)"),
        iban: z.string().optional().describe("IBAN (EU, RO)"),
        bsb: z.string().optional().describe("BSB code (AU)"),
        recipient_country: z
          .string()
          .optional()
          .describe("Recipient country ISO code (EU, RO)"),
        recipient_currency: z
          .string()
          .optional()
          .describe("Recipient currency (EU, RO)"),
        individual_name: z
          .string()
          .optional()
          .describe("Individual name to validate"),
        company_name: z
          .string()
          .optional()
          .describe("Company name to validate"),
      },
    },
    async (params) => {
      logToolCall("revolut_validate_account_name", params);
      try {
        const body: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) body[k] = v;
        }
        const result = await client.postJson(
          "/api/1.0/account-name-validation",
          body
        );
        return jsonResponse(result);
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
        "Retrieve a list of counterparties with optional filtering by name, account number, IBAN, or BIC. Supports cursor-based pagination via created_before.",
      inputSchema: {
        name: z
          .string()
          .optional()
          .describe("Filter by name (partial match)"),
        account_no: z
          .string()
          .optional()
          .describe("Filter by account number"),
        sort_code: z
          .string()
          .optional()
          .describe("Filter by sort code (use with account_no)"),
        iban: z.string().optional().describe("Filter by IBAN"),
        bic: z
          .string()
          .optional()
          .describe("Filter by BIC (use with iban)"),
        created_before: z
          .string()
          .optional()
          .describe("Pagination cursor: ISO 8601 datetime"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Max results (1-1000, default 100)"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_counterparties", params);
      try {
        const result = await client.get(
          "/api/1.0/counterparties",
          buildParams(params)
        );
        return jsonResponse(result);
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
        company_name: z.string().optional().describe("Company name"),
        individual_name: z
          .object({
            first_name: z.string().describe("First name"),
            last_name: z.string().describe("Last name"),
          })
          .optional()
          .describe("Individual name object"),
        name: z
          .string()
          .optional()
          .describe("Name for Revolut counterparty (with revtag)"),
        profile_type: z
          .enum(["personal", "business"])
          .optional()
          .describe("Profile type"),
        revtag: z
          .string()
          .optional()
          .describe("Revtag for Revolut counterparties"),
        account_no: z.string().optional().describe("Account number"),
        iban: z.string().optional().describe("IBAN"),
        sort_code: z.string().optional().describe("Sort code"),
        routing_number: z.string().optional().describe("Routing number"),
        bic: z.string().optional().describe("BIC/SWIFT code"),
        clabe: z.string().optional().describe("CLABE (Mexico)"),
        ifsc: z.string().optional().describe("IFSC code (India)"),
        bsb_code: z.string().optional().describe("BSB code (Australia)"),
        bank_country: z
          .string()
          .optional()
          .describe("Bank country ISO code"),
        currency: z.string().optional().describe("Currency code"),
        address: z
          .object({
            street_line1: z.string().optional(),
            street_line2: z.string().optional(),
            region: z.string().optional(),
            city: z.string().optional(),
            country: z.string(),
            postcode: z.string(),
          })
          .optional()
          .describe("Address of the counterparty"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_counterparty", {
        company_name: params.company_name,
        name: params.name,
      });
      try {
        const body: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) body[k] = v;
        }
        const result = await client.postJson("/api/1.0/counterparty", body);
        return jsonResponse(result);
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
      inputSchema: {
        counterparty_id: z.string().describe("The counterparty ID (UUID)"),
      },
    },
    async ({ counterparty_id }) => {
      logToolCall("revolut_get_counterparty", { counterparty_id });
      try {
        const result = await client.get(
          `/api/1.0/counterparty/${counterparty_id}`
        );
        return jsonResponse(result);
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
      inputSchema: {
        counterparty_id: z.string().describe("The counterparty ID (UUID)"),
      },
    },
    async ({ counterparty_id }) => {
      logToolCall("revolut_delete_counterparty", { counterparty_id });
      try {
        await client.deleteReq(
          `/api/1.0/counterparty/${counterparty_id}`
        );
        return jsonResponse({ success: true, message: "Counterparty deleted" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
