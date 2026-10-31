import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  buildParams,
  cursorParams,
  limitParam,
  uuid,
} from "../utils.js";

export function registerTeamMemberTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_list_team_members",
    {
      title: "List Team Members",
      description:
        "Retrieve a list of team members in the organisation. Supports cursor-based pagination; a note is added when a full page came back.",
      inputSchema: { ...cursorParams, limit: limitParam(1000) },
    },
    async (params) => {
      logToolCall("revolut_list_team_members", params);
      try {
        const result = await client.get("/api/1.0/team-members", buildParams(params));
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
    "revolut_invite_team_member",
    {
      title: "Invite Team Member",
      description: "Invite a new member to the business by email. Requires a role_id.",
      inputSchema: {
        email: z.email().max(254).describe("Email address of the new team member"),
        role_id: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,64}$/, "role_id must be letters, digits, - or _")
          .describe("Role ID to assign (use revolut_list_roles to get available roles)"),
      },
    },
    async ({ email, role_id }) => {
      logToolCall("revolut_invite_team_member", { email, role_id });
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/team-members", { email, role_id })
        );
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
      inputSchema: { team_member_id: uuid.describe("The team member ID (UUID)") },
    },
    async ({ team_member_id }) => {
      logToolCall("revolut_delete_team_member", { team_member_id });
      try {
        await client.deleteReq(`/api/1.0/team-members/${team_member_id}`);
        return jsonResponse({ success: true, message: "Team member deleted" });
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
        "Retrieve available team roles that can be assigned to team members. A note is added when a full page came back.",
      inputSchema: { ...cursorParams, limit: limitParam(1000) },
    },
    async (params) => {
      logToolCall("revolut_list_roles", params);
      try {
        const result = await client.get("/api/1.0/roles", buildParams(params));
        return listResponse(result, {
          limit: params.limit,
          cursorParam: "created_before",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
