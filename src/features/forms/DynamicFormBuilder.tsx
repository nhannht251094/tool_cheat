import { Copy, EyeOff, GripVertical, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { useStudioStore } from "../../store/useStudioStore";
import { ENVIRONMENTS } from "../../lib/apiEndpoint";
import type { FieldConfig } from "../../types/studio";

const fieldTypes: FieldConfig["type"][] = [
  "text",
  "number",
  "select",
  "checkbox",
  "textarea",
  "json"
];

export function DynamicFormBuilder() {
  const {
    projects,
    activeProjectId,
    formValues,
    updateField,
    duplicateField,
    addField,
    updateFormValue
  } = useStudioStore();
  const project = projects.find((item) => item.projectId === activeProjectId);
  useForm({ values: formValues });

  if (!project) return null;

  function renderField(field: FieldConfig) {
    const value = formValues[field.key] ?? field.defaultValue;
    if (field.hidden) {
      return (
        <div className="hidden-field" key={field.id}>
          <EyeOff size={14} />
          {field.label}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label className="builder-check" key={field.id}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={field.readonly}
            onChange={(event) => updateFormValue(field.key, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "textarea" || field.type === "json") {
      return (
        <label className="builder-field" key={field.id}>
          {field.label}
          <textarea
            value={String(value)}
            readOnly={field.readonly}
            placeholder={field.placeholder}
            onChange={(event) => updateFormValue(field.key, event.target.value)}
          />
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label className="builder-field" key={field.id}>
          {field.label}
          <select
            value={String(value)}
            disabled={field.readonly}
            onChange={(event) => updateFormValue(field.key, event.target.value)}
          >
            {ENVIRONMENTS.map((environment) => (
              <option key={environment}>{environment}</option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="builder-field" key={field.id}>
        {field.label}
        <input
          type={field.type}
          value={String(value)}
          readOnly={field.readonly}
          placeholder={field.placeholder}
          onChange={(event) =>
            updateFormValue(
              field.key,
              field.type === "number" ? Number(event.target.value) : event.target.value
            )
          }
        />
      </label>
    );
  }

  return (
    <Panel
      eyebrow="Dynamic Form"
      title="Payload Fields"
      action={
        <div className="field-type-menu">
          {fieldTypes.map((type) => (
            <button key={type} onClick={() => addField(type)}>
              <Plus size={12} />
              {type}
            </button>
          ))}
        </div>
      }
    >
      <div className="form-builder">
        <div className="field-render-list">{project.fieldConfigs.map(renderField)}</div>

        <div className="field-config-list">
          {project.fieldConfigs.map((field) => (
            <article className="field-config-card" key={field.id}>
              <div className="field-config-head">
                <GripVertical size={15} />
                <strong>{field.category}</strong>
                <button onClick={() => duplicateField(field.id)} title="Duplicate field">
                  <Copy size={14} />
                </button>
              </div>
              <div className="field-config-grid">
                <label>
                  Label
                  <input
                    value={field.label}
                    onChange={(event) => updateField(field.id, { label: event.target.value })}
                  />
                </label>
                <label>
                  Key
                  <input
                    value={field.key}
                    onChange={(event) => updateField(field.id, { key: event.target.value })}
                  />
                </label>
                <label>
                  Default
                  <input
                    value={String(field.defaultValue)}
                    onChange={(event) =>
                      updateField(field.id, { defaultValue: event.target.value })
                    }
                  />
                </label>
                <label>
                  Validation
                  <input
                    value={field.validation ?? ""}
                    onChange={(event) => updateField(field.id, { validation: event.target.value })}
                    placeholder="min:0|max:999"
                  />
                </label>
              </div>
              <div className="field-flags">
                {(["required", "readonly", "hidden"] as const).map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(field[key])}
                      onChange={(event) => updateField(field.id, { [key]: event.target.checked })}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}
