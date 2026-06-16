# Next Action

Implement runtime discovery:
- Add a safe command runner abstraction for systemctl inspection.
- Parse `systemctl list-units` and `systemctl show` output.
- Validate candidate services by discovered `WorkingDirectory` and `server.properties`.
- Parse `server.properties` without persisting sensitive values.
- Return stable non-sensitive runtime ids.
- Add unit tests for parser behavior.
