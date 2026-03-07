import PublicPageLayout from "../components/PublicPageLayout";

const Security = () => {
  return (
    <PublicPageLayout
      title="Security"
      subtitle="Last updated: March 7, 2026"
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">1. Security Program Overview</h2>
        <div className="space-y-3">
          <p>
            Root Nepal ERP applies a layered security approach designed to protect account
            access, business records, and operational continuity across core ERP workflows.
            Security controls are applied at the application, infrastructure, and process level.
          </p>
          <p>
            Our security program focuses on confidentiality, integrity, and availability of
            customer information, with practical safeguards tailored for product management,
            inventory operations, and business reporting environments.
          </p>
          <p>
            Security practices are continuously improved as threats evolve, platform features
            expand, and operational requirements change.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">2. Infrastructure Security</h2>
        <div className="space-y-3">
          <p>
            The platform is deployed on managed cloud infrastructure with network-level
            protections, restricted administrative access paths, and environment isolation
            principles where practical.
          </p>
          <p>
            We use controlled deployment practices to reduce risk from unauthorized changes.
            Infrastructure and services are monitored to detect abnormal behavior and maintain
            stable system operation.
          </p>
          <p>
            Capacity and resilience measures are applied to minimize service disruption and
            support continuity of ERP operations during peak business use.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">3. Encryption and Data Protection</h2>
        <div className="space-y-3">
          <p>
            Data in transit is protected using HTTPS/TLS to reduce interception risk between
            clients, APIs, and platform services.
          </p>
          <p>
            Sensitive authentication and session-related information is handled with secure
            storage and transmission practices designed to reduce credential exposure and
            unauthorized access risk.
          </p>
          <p>
            Data protection controls are aligned with practical ERP usage needs, where
            confidentiality and integrity of inventory and operational records are critical.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">4. Access Management and Authentication</h2>
        <div className="space-y-3">
          <p>
            Access to internal systems and support tooling is limited to authorized personnel
            with role-based permissions and least-privilege principles.
          </p>
          <p>
            Customer account access is controlled through authenticated sessions, and platform
            logic enforces boundaries between users and workspaces based on application rules.
          </p>
          <p>
            Administrative access paths are treated as high-risk zones and are managed with
            stricter controls and review expectations.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">5. Application Security Practices</h2>
        <div className="space-y-3">
          <p>
            Security is considered during development through validation rules, defensive coding
            patterns, and controlled release processes intended to reduce common web application
            vulnerabilities.
          </p>
          <p>
            Changes to business-critical ERP features are tested before release to reduce risk of
            regressions affecting data integrity, inventory movement tracking, or authorization
            behavior.
          </p>
          <p>
            Dependency and configuration updates are applied as part of ongoing maintenance to
            address known issues and improve baseline security posture.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">6. Logging, Monitoring, and Detection</h2>
        <div className="space-y-3">
          <p>
            Operational and security-relevant events are monitored to help identify suspicious
            activity, service anomalies, and reliability concerns in a timely manner.
          </p>
          <p>
            Monitoring supports incident triage and root-cause analysis, including review of
            authentication behavior, request patterns, and system performance metrics.
          </p>
          <p>
            Audit-oriented visibility is maintained to assist with investigation, platform hardening,
            and continuous improvement of detection controls.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">7. Incident Response and Recovery</h2>
        <div className="space-y-3">
          <p>
            We maintain incident response procedures to identify, contain, investigate, and
            remediate security events with urgency proportional to impact and risk.
          </p>
          <p>
            Response activities may include temporary containment controls, credential hygiene
            actions, service hardening, and coordinated recovery steps to restore safe operation.
          </p>
          <p>
            Post-incident review is performed to improve safeguards, close gaps, and reduce
            recurrence risk across the platform.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">8. Data Backup and Business Continuity</h2>
        <div className="space-y-3">
          <p>
            Backup and continuity measures are used to support restoration capability and reduce
            operational impact from system failures or unexpected disruptions.
          </p>
          <p>
            Recovery workflows are designed to preserve critical ERP records such as inventory and
            product data while balancing platform availability and data consistency requirements.
          </p>
          <p>
            Customers should still maintain internal backup and reconciliation controls for
            mission-critical financial or compliance records.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">9. Personnel and Internal Controls</h2>
        <div className="space-y-3">
          <p>
            Internal access is controlled through defined responsibilities and operational oversight
            to limit unnecessary exposure to sensitive systems and data.
          </p>
          <p>
            Security and confidentiality expectations are applied to personnel handling customer
            information or administering infrastructure components.
          </p>
          <p>
            Process-level controls are used to support secure operations, accountability, and
            consistent handling of privileged activities.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">10. Customer Responsibilities</h2>
        <div className="space-y-3">
          <p>
            Customers are responsible for protecting their account credentials, assigning appropriate
            user permissions, and reviewing account activity in their ERP workspace.
          </p>
          <p>
            You should maintain secure endpoint practices, strong password hygiene, and internal
            approval flows for sensitive operations such as inventory adjustments and account changes.
          </p>
          <p>
            Security is a shared responsibility model: platform safeguards are effective when combined
            with disciplined customer-side access and process controls.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">11. Third-Party Services and Risk</h2>
        <div className="space-y-3">
          <p>
            Certain platform capabilities may rely on third-party infrastructure or software
            components, and we evaluate those dependencies as part of operational risk management.
          </p>
          <p>
            While we aim to select reliable providers, third-party outages or vulnerabilities can
            affect service conditions outside our direct control.
          </p>
          <p>
            When third-party issues arise, we take reasonable remediation steps, coordinate response
            actions, and apply mitigation measures to protect platform operations.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">12. Responsible Disclosure</h2>
        <div className="space-y-3">
          <p>
            We welcome good-faith security reports from researchers, users, and partners who identify
            potential vulnerabilities in the Service.
          </p>
          <p>
            Please avoid actions that disrupt operations, compromise customer data, or violate law.
            Provide enough technical detail so our team can reproduce and investigate responsibly.
          </p>
          <p>
            Report potential issues to{" "}
            <a className="font-medium text-slate-900 underline" href="mailto:support@rootnepalerp.com">
              support@rootnepalerp.com
            </a>{" "}
            for coordinated triage and remediation.
          </p>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default Security;
