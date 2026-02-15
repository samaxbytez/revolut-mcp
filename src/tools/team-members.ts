import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

export function registerTeamMemberTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_team_members",
    {
      title: "List Team Members",
      description:
        "Retrieve a list of team members in the organisation. Supports cursor-based pagination.",
      inputSchema: {
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
      logToolCall("revolut_list_team_members", params);
      try {
        const result = await client.get(
          "/api/1.0/team-members",
          buildParams(params)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_invite_team_member",
    {
      title: "Invite Team Member",
      description:
        "Invite a new member to the business by email. Requires a role_id.",
      inputSchema: {
        email: z.string().describe("Email address of the new team member"),
        role_id: z.string().describe("Role ID to assign (use revolut_list_roles to get available roles)"),
      },
    },
    async ({ email, role_id }) => {
      logToolCall("revolut_invite_team_member", { email });
      try {
        const result = await client.postJson("/api/1.0/team-members", {
          email,
          role_id,
        });
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_delete_team_member",
    {
      title: "Delete Team Member",
      description: "Remove a team member from the business.",
      inputSchema: {
        team_member_id: z.string().describe("The team member ID (UUID)"),
      },
    },
    async ({ team_member_id }) => {
      logToolCall("revolut_delete_team_member", { team_member_id });
      try {
        await client.deleteReq(`/api/1.0/team-members/${team_member_id}`);
        return jsonResponse({
          success: true,
          message: "Team member deleted",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_roles",
    {
      title: "List Team Roles",
      description:
        "Retrieve available team roles that can be assigned to team members.",
      inputSchema: {
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
      logToolCall("revolut_list_roles", params);
      try {
        const result = await client.get(
          "/api/1.0/roles",
          buildParams(params)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
