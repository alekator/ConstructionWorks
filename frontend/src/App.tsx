import { FormEvent, useEffect, useMemo, useState } from "react";

type WorkType = {
  id: string;
  name: string;
};

type WorkLog = {
  id: string;
  performedAt: string;
  volumeValue: number;
  volumeUnit: string;
  workerName: string;
  workTypeId: string;
  workType: WorkType;
};

type WorkLogFormState = {
  performedAt: string;
  workTypeId: string;
  volumeValue: string;
  volumeUnit: string;
  workerName: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const defaultForm: WorkLogFormState = {
  performedAt: "",
  workTypeId: "",
  volumeValue: "",
  volumeUnit: "м3",
  workerName: ""
};

const units = ["м3", "м2", "пог.м", "шт"];

const toDateInputValue = (isoDate: string) => isoDate.slice(0, 10);

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(isoDate));

const buildQuery = (filters: { dateFrom: string; dateTo: string; sort: "asc" | "desc" }) => {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  params.set("sort", filters.sort);

  return params.toString();
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? "Ошибка запроса";
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const App = () => {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    sort: "desc" as "asc" | "desc"
  });

  const [form, setForm] = useState<WorkLogFormState>(defaultForm);

  const formTitle = useMemo(
    () => (editingId ? "Редактировать запись" : "Новая запись"),
    [editingId]
  );

  const loadWorkTypes = async () => {
    const data = await request<WorkType[]>(`${API_BASE}/work-types`);
    setWorkTypes(data);

    if (!form.workTypeId && data.length > 0) {
      setForm((prev) => ({ ...prev, workTypeId: data[0].id }));
    }
  };

  const loadWorkLogs = async () => {
    const query = buildQuery(filters);
    const data = await request<WorkLog[]>(`${API_BASE}/work-logs?${query}`);
    setWorkLogs(data);
  };

  const loadAll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([loadWorkTypes(), loadWorkLogs()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить данные");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void loadWorkLogs().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить журнал");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.sort]);

  const resetForm = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...defaultForm,
      workTypeId: workTypes[0]?.id ?? prev.workTypeId
    }));
  };

  const validateForm = () => {
    if (!form.performedAt || !form.workTypeId || !form.volumeValue || !form.workerName.trim()) {
      throw new Error("Заполните все обязательные поля");
    }

    if (Number(form.volumeValue) <= 0) {
      throw new Error("Объем должен быть больше 0");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      validateForm();
      setIsSubmitting(true);
      setError(null);

      const payload = {
        performedAt: form.performedAt,
        workTypeId: form.workTypeId,
        volumeValue: Number(form.volumeValue),
        volumeUnit: form.volumeUnit,
        workerName: form.workerName.trim()
      };

      if (editingId) {
        await request<WorkLog>(`${API_BASE}/work-logs/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await request<WorkLog>(`${API_BASE}/work-logs`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      await loadWorkLogs();
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить запись");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (log: WorkLog) => {
    setEditingId(log.id);
    setForm({
      performedAt: toDateInputValue(log.performedAt),
      workTypeId: log.workTypeId,
      volumeValue: String(log.volumeValue),
      volumeUnit: log.volumeUnit,
      workerName: log.workerName
    });
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = window.confirm("Удалить запись из журнала?");

    if (!isConfirmed) {
      return;
    }

    try {
      setError(null);
      await request<void>(`${API_BASE}/work-logs/${id}`, { method: "DELETE" });
      await loadWorkLogs();

      if (editingId === id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить запись");
    }
  };

  return (
    <main className="layout">
      <section className="panel">
        <header className="header">
          <h1>Журнал работ</h1>
          <p>Учет ежедневных строительных работ по объекту.</p>
        </header>

        {error ? <div className="alert">{error}</div> : null}

        <div className="grid">
          <form className="card" onSubmit={handleSubmit}>
            <h2>{formTitle}</h2>

            <label>
              Дата выполнения
              <input
                type="date"
                value={form.performedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, performedAt: event.target.value }))}
                required
              />
            </label>

            <label>
              Вид работ
              <select
                value={form.workTypeId}
                onChange={(event) => setForm((prev) => ({ ...prev, workTypeId: event.target.value }))}
                required
              >
                {workTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="row">
              <label>
                Объем
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.volumeValue}
                  onChange={(event) => setForm((prev) => ({ ...prev, volumeValue: event.target.value }))}
                  required
                />
              </label>

              <label>
                Ед. измерения
                <select
                  value={form.volumeUnit}
                  onChange={(event) => setForm((prev) => ({ ...prev, volumeUnit: event.target.value }))}
                  required
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Исполнитель (ФИО)
              <input
                type="text"
                maxLength={120}
                value={form.workerName}
                onChange={(event) => setForm((prev) => ({ ...prev, workerName: event.target.value }))}
                required
              />
            </label>

            <div className="actions">
              <button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
              </button>
              {editingId ? (
                <button type="button" className="secondary" onClick={resetForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </form>

          <section className="card">
            <h2>Записи</h2>

            <div className="filters">
              <label>
                С даты
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                По дату
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateTo: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Сортировка
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      sort: event.target.value as "asc" | "desc"
                    }))
                  }
                >
                  <option value="desc">Сначала новые</option>
                  <option value="asc">Сначала старые</option>
                </select>
              </label>
            </div>

            {isLoading ? (
              <p className="hint">Загрузка данных...</p>
            ) : workLogs.length === 0 ? (
              <p className="hint">Записей пока нет.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Вид работ</th>
                      <th>Объем</th>
                      <th>Исполнитель</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.performedAt)}</td>
                        <td>{log.workType.name}</td>
                        <td>
                          {log.volumeValue} {log.volumeUnit}
                        </td>
                        <td>{log.workerName}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="small secondary" onClick={() => handleEdit(log)}>
                              Редактировать
                            </button>
                            <button type="button" className="small danger" onClick={() => handleDelete(log.id)}>
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};