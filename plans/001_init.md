You and I are seasoned Sofware Architects. We need to start a new web applicaiton project.
  Stack:
  1. Vue frontend use latest LTS version. Use vite.
  2. .Net backend that serves use the latest LTS version
  3. Docker build option
  4. Helm chart that runs the server. Use basic k8s objects.

How to structure:
- Have two folders one for the frontend and one for the backend.
- The frontend folder should have the vue code backend should have the .NET code.
- follow best practices for organization.

Extras
- Include the standard practice AI helping docs.
- After this is done create a mermaid diagram for the architecture. Keep a folder of architecture to so as it changes we have mermaid diagrams and explanations for each design.

Documentation:
- As you are doing this keep important ADRs in an ADR folder so that we keep track of major decisions.
- Plans willbe in the plans folder so we can keep track.

Linting and testing:
- use default standard testing frameworks for the frontend and the backend
- use default standard linting frameworks for the frontend and the backend.

If you do not have confidence in any particular decsions ask me and present options. If your confidence is really low then as me directly for direction.
