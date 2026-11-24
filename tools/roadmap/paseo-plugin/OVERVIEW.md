A sidebar screen that shows a project's open beads epics as a roadmap chart.

Each row is an epic. Its bar spans the dependency columns of its open issues, and the green part is the share already closed. Tap an epic to list its open issues. Columns show order, not calendar time: an issue sits one column after the last issue blocking it.

The plugin runs `bd list --all --json` on the daemon machine, in the projects Paseo knows about that contain a `.beads` folder. It needs the `bd` CLI on the daemon's PATH and refreshes every 30 seconds. It is read-only.
