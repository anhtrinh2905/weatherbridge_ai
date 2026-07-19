"""OpenAI-backed advisory drafting for hazard alerts.

Two request-time helpers:

* ``draft_alert`` — proposes the three bulletin fields (what happened, why it is
  dangerous, what to do) from a hazard's type/level/tier so an officer has an
  editable starting point. Always human-reviewed before publishing.
* ``suggest_resident_actions`` — expands a published, terse bulletin into a short
  ordered checklist a resident can follow.

This is an online inference adapter and belongs to the backend (see AGENTS.md);
it never trains or serves weights.
"""
