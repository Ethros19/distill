const LINEAR_API_URL = 'https://api.linear.app/graphql'

export function isLinearConfigured(): boolean {
  return !!(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID)
}

interface CreateIssueParams {
  title: string
  description: string
  teamId?: string
}

interface CreateIssueResult {
  success: boolean
  issueId?: string
  issueUrl?: string
  identifier?: string
  error?: string
}

const CREATE_ISSUE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
        title
      }
    }
  }
`

export async function createLinearIssue(
  params: CreateIssueParams,
): Promise<CreateIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY?.trim()
  if (!apiKey) {
    return { success: false, error: 'LINEAR_API_KEY is not configured' }
  }

  const teamId = (params.teamId ?? process.env.LINEAR_TEAM_ID)?.trim()
  if (!teamId) {
    return { success: false, error: 'LINEAR_TEAM_ID is not configured' }
  }

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: CREATE_ISSUE_MUTATION,
        variables: {
          input: {
            title: params.title,
            description: params.description,
            teamId,
          },
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Linear API error:', response.status, JSON.stringify(data))
      return {
        success: false,
        error: `Linear API returned ${response.status}: ${JSON.stringify(data.errors ?? data)}`,
      }
    }

    if (data.errors?.length) {
      console.error('Linear GraphQL errors:', JSON.stringify(data.errors))
      return {
        success: false,
        error: data.errors.map((e: { message: string }) => e.message).join(', '),
      }
    }

    const result = data.data?.issueCreate
    if (!result?.success || !result?.issue) {
      return { success: false, error: 'Linear issue creation failed' }
    }

    return {
      success: true,
      issueId: result.issue.id,
      issueUrl: result.issue.url,
      identifier: result.issue.identifier,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating Linear issue',
    }
  }
}
