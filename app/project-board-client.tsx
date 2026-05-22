"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { STATUSES, TASK_LEVELS, type OperationTask, type Project } from "@/lib/types";

type SortMode = "default" | "due" | "open" | "slow";

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: "標準", value: "default" },
  { label: "期限順", value: "due" },
  { label: "未完了順", value: "open" },
  { label: "遅れ順", value: "slow" }
];

export function ProjectBoardClient({
  initialQuery,
  initialSort,
  projects,
  tasks
}: {
  initialQuery: string;
  initialSort?: string;
  projects: Project[];
  tasks: OperationTask[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortMode>(isSortMode(initialSort) ? initialSort : "default");
  const sortedProjects = useMemo(() => sortProjects(filterProjectsByQuery(projects, query), tasks, sort), [projects, query, sort, tasks]);

  return (
    <>
      <div className="sectionHeader">
        <div>
          <h2>案件別タスク</h2>
          <p className="mutedText">検索しても画面移動せず、この場所のまま案件を絞り込めます。</p>
        </div>
        <div className="projectTools">
          <div className="projectSearchForm">
            <label className="srOnly" htmlFor="project-search">案件検索</label>
            <input id="project-search" onChange={(event) => setQuery(event.target.value)} placeholder="案件名で検索" type="search" value={query} />
            {query ? (
              <button className="secondaryButton" onClick={() => setQuery("")} type="button">
                クリア
              </button>
            ) : null}
          </div>
          <div className="sortLinks" role="group" aria-label="案件の並び替え">
            {SORT_OPTIONS.map((option) => (
              <button
                className={sort === option.value ? "sortLink sortLinkActive" : "sortLink"}
                key={option.value}
                onClick={() => setSort(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="projectBoard">
        {sortedProjects.map((project) => (
          <ProjectCard key={project.id} project={project} tasks={tasks.filter((task) => task.project_id === project.id)} />
        ))}
        {sortedProjects.length === 0 ? <div className="empty">条件に合う案件がありません</div> : null}
      </div>
    </>
  );
}

function filterProjectsByQuery(projects: Project[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return projects;
  }

  return projects.filter((project) => project.name.toLowerCase().includes(normalized) || project.category.toLowerCase().includes(normalized));
}

function sortProjects(projects: Project[], tasks: OperationTask[], sort: SortMode) {
  const decorated = projects.map((project, index) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const openCount = projectTasks.filter((task) => task.status !== STATUSES[3]).length;
    const doneCount = projectTasks.length - openCount;
    const progress = projectTasks.length === 0 ? 0 : doneCount / projectTasks.length;

    return { index, openCount, progress, project };
  });

  if (sort === "due") {
    return decorated
      .toSorted((a, b) => (a.project.due_date ?? "9999-12-31").localeCompare(b.project.due_date ?? "9999-12-31"))
      .map((item) => item.project);
  }

  if (sort === "open") {
    return decorated.toSorted((a, b) => b.openCount - a.openCount).map((item) => item.project);
  }

  if (sort === "slow") {
    return decorated.toSorted((a, b) => a.progress - b.progress).map((item) => item.project);
  }

  return decorated.toSorted((a, b) => a.index - b.index).map((item) => item.project);
}

function ProjectCard({ project, tasks }: { project: Project; tasks: OperationTask[] }) {
  const openTasks = tasks.filter((task) => task.status !== STATUSES[3]);
  const completeCount = tasks.length - openTasks.length;
  const progress = tasks.length === 0 ? 0 : Math.round((completeCount / tasks.length) * 100);
  const middleCount = tasks.filter((task) => task.task_level === TASK_LEVELS[0] || !task.parent_task_id).length;
  const childCount = tasks.filter((task) => task.task_level === TASK_LEVELS[1] && task.parent_task_id).length;

  return (
    <section className="projectCard">
      <header className="projectHeader">
        <div>
          <h3>{project.name}</h3>
          <span className="levelMark">{project.category}</span>
          <p>{project.due_date ? `案件期日 ${project.due_date}` : "案件期日 未設定"}</p>
        </div>
        <div className="projectHeaderActions">
          <Link className="detailLink" href={`/projects/${project.id}`}>
            詳細
          </Link>
        </div>
      </header>
      <div className="projectSummaryBody">
        <div className="projectProgressHeader">
          <span>進捗</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progressTrack projectProgressTrack" aria-label={`進捗 ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="projectStats">
          <span>全タスク {tasks.length}</span>
          <span>未完了 {openTasks.length}</span>
          <span>完了 {completeCount}</span>
          <span>中 {middleCount}</span>
          <span>小 {childCount}</span>
        </div>
      </div>
    </section>
  );
}

function isSortMode(value: string | undefined): value is SortMode {
  return value === "default" || value === "due" || value === "open" || value === "slow";
}
