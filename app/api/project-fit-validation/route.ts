import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead_id, email, answers } = body;

    if (!lead_id) {
      return NextResponse.json(
        { error: "lead_id is required" },
        { status: 400 }
      );
    }

    const client_id = process.env.ZOHO_CLIENT_ID;
    const client_secret = process.env.ZOHO_CLIENT_SECRET;
    const refresh_token = process.env.ZOHO_REFRESH_TOKEN;
    const accounts_url = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
    const api_url = process.env.ZOHO_API_URL || "https://www.zohoapis.com";

    if (!client_id || !client_secret || !refresh_token) {
      console.warn("Zoho CRM credentials missing. Simulating successful update.");
      return NextResponse.json({
        success: true,
        simulated: true,
        message: "Credentials missing. Zoho lead update simulated successfully."
      });
    }

    // 1. Get Zoho Access Token
    const tokenUrl = `${accounts_url}/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token`;
    
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json(
        { error: "Failed to refresh Zoho token", details: errText },
        { status: 500 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token not found in Zoho OAuth response", details: tokenData },
        { status: 500 }
      );
    }

    // 2. Prepare Zoho CRM Leads update payload
    // Map the form answers to Zoho CRM fields.
    // In custom Zoho set-ups, these can be mapped to custom fields. 
    // We will update standard/custom fields or append them to a Notes/Description field for flexibility.
    const leadDescription = `
--- Project Fit Validation Form ---
Submitted Email: ${email || "Not Provided"}
Estimated Budget: ${answers.budget || "N/A"}
Desired Timeline: ${answers.timeline || "N/A"}
Project Scope: ${answers.scope || "N/A"}
Tech Stack Prefs: ${answers.techStack || "N/A"}
Decision Makers Aligned: ${answers.decisionMakers || "N/A"}
Validation Notes: ${answers.notes || "None"}
`;

    // We'll update the Description, and set Fit_Validated = True if such a custom field exists.
    // We also support custom fields that the user can map easily in their CRM.
    const updatePayload = {
      data: [
        {
          id: lead_id,
          Description: leadDescription,
          // You can uncomment/add custom API names here:
          // Fit_Validated: true,
          // Budget_Validated: answers.budget,
          // Timeline_Validated: answers.timeline,
        },
      ],
    };

    // Update using Zoho CRM v6 (or v3/v2) API
    // We will try updating standard CRM Lead
    const updateUrl = `${api_url}/crm/v6/Leads`;
    const updateRes = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return NextResponse.json(
        { error: "Failed to update Lead in Zoho CRM", details: errText },
        { status: 500 }
      );
    }

    const updateData = await updateRes.json();
    
    // Check if the update was successful in Zoho response list
    const checkStatus = updateData?.data?.[0];
    if (checkStatus && checkStatus.status !== "success") {
      return NextResponse.json(
        { error: "Zoho CRM returned an error for the Lead", details: updateData },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updateData,
    });
  } catch (error: any) {
    console.error("Error in project-fit-validation API:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
