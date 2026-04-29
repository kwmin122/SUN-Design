import type {
  AgentContextPackage,
  AgentOutputEnvelope,
  AgentRecipe,
  AgentRun,
  AssetDownloadRecord,
  CanvasOperation,
  CodeRoundtripImport,
  CodeRoundtripPackage,
  DevCodeSnippet,
  DevModeInspectReport,
  ExportArtifact,
  ExportVerification,
  PresentationState,
  ProjectBundle,
  PublishPreview,
  PrototypeCondition,
  PrototypeInteraction,
  ReadyForDevMarker,
  SlideBlock,
  SlideFeedback,
  VariationDirection,
  VariationSet,
  VersionDiffRecord
} from "./schemas.js";
import { validateAgentDirectionSafety, validateAgentOutputScope } from "./agent-output.js";
import { validatePublicSourceUrl } from "./context-ingestion.js";
import { validateSyncEnvelope } from "./sync.js";

const COMPONENT_STATES = new Set(["default", "hover", "pressed", "disabled"]);

export function assertProjectBundleIntegrity(bundle: ProjectBundle): void {
  assertContextIngestionIntegrity(bundle);
  assertPrototypeIntegrity(bundle);
  assertPresentationIntegrity(bundle);
  assertSlideDeckIntegrity(bundle);
  assertVariationIntegrity(bundle);
  assertAgentRecipeIntegrity(bundle);
  assertAgentContextPackageIntegrity(bundle);
  assertAgentOutputIntegrity(bundle);
  assertAgentRunIntegrity(bundle);
  assertPhase10Integrity(bundle);
}

export function assertContextIngestionIntegrity(bundle: ProjectBundle): void {
  const sourceIds = new Set(bundle.sourceRecords.map((source) => source.id));
  const sourcesById = new Map(bundle.sourceRecords.map((source) => [source.id, source]));
  const assetIds = new Set(bundle.assets.map((asset) => asset.id));
  const dataSourceIds = new Set(bundle.dataSources.map((source) => source.id));
  const dataSourcesById = new Map(bundle.dataSources.map((source) => [source.id, source]));
  const noteIds = new Set(bundle.generatedNotes.map((note) => note.id));

  for (const source of bundle.sourceRecords) {
    for (const assetId of source.assetIds) {
      assertAsset(assetIds, assetId, "Source record");
    }
    if (source.sourceUrl) {
      const validation = validatePublicSourceUrl(source.sourceUrl);
      if (!validation.valid && source.parseStatus !== "blocked") {
        throw new Error(`Source record URL is not public: ${source.id}`);
      }
    }
    if (source.kind !== "unsupported" && source.parseStatus !== "queued" && !hasSourceEvidence(source)) {
      throw new Error(`Source record missing provenance evidence: ${source.id}`);
    }
    assertSourceStatus(source);
  }

  for (const job of bundle.ingestionJobs) {
    assertSource(sourceIds, job.sourceId, "Ingestion job");
  }
  for (const artifact of bundle.parsedContextArtifacts) {
    assertSource(sourceIds, artifact.sourceId, "Parsed context artifact");
    for (const assetId of artifact.assetIds) {
      assertAsset(assetIds, assetId, "Parsed context artifact");
    }
  }
  for (const note of bundle.generatedNotes) {
    if (note.kind === "source-notes" && note.path !== "source-notes.md") {
      throw new Error(`Generated source notes use an invalid path: ${note.path}`);
    }
    if (note.kind === "design-context" && note.path !== "design-context.md") {
      throw new Error(`Generated design context uses an invalid path: ${note.path}`);
    }
    for (const sourceId of note.sourceIds) {
      assertSource(sourceIds, sourceId, "Generated note");
    }
  }
  if (noteIds.size !== bundle.generatedNotes.length) {
    throw new Error("Generated note id is duplicated.");
  }
  for (const snapshot of bundle.webSnapshots) {
    assertSource(sourceIds, snapshot.sourceId, "Web snapshot");
    const source = sourcesById.get(snapshot.sourceId);
    const snapshotUrlValidation = validatePublicSourceUrl(snapshot.url);
    if (!snapshotUrlValidation.valid && snapshot.status !== "blocked") {
      throw new Error(`Web snapshot URL is not public: ${snapshot.id}`);
    }
    if (source?.sourceUrl) {
      const sourceUrlValidation = validatePublicSourceUrl(source.sourceUrl);
      if (sourceUrlValidation.valid && snapshotUrlValidation.valid && snapshot.url !== sourceUrlValidation.normalizedUrl) {
        throw new Error(`Web snapshot URL does not match source URL: ${snapshot.id}`);
      }
    }
    if (snapshot.status === "editable" && (!snapshot.sanitizedHtml || !snapshot.normalizedHtml)) {
      throw new Error(`Editable web snapshot is missing stored HTML: ${snapshot.id}`);
    }
    if (snapshot.screenshotAssetId) {
      assertAsset(assetIds, snapshot.screenshotAssetId, "Web snapshot");
    }
    for (const objectId of snapshot.canvasObjectIds) {
      const object = assertCanvasObject(bundle, objectId, "Web snapshot");
      if (snapshot.status === "editable" && !object.nodeId && object.childIds.length === 0) {
        throw new Error(`Editable web snapshot has no editable canvas section: ${snapshot.id}`);
      }
    }
  }
  for (const dataSource of bundle.dataSources) {
    assertSource(sourceIds, dataSource.sourceId, "Data source");
  }
  for (const binding of bundle.dataBindings) {
    if (!dataSourceIds.has(binding.dataSourceId)) {
      throw new Error(`data binding references missing data source: ${binding.dataSourceId}`);
    }
    const dataSource = dataSourcesById.get(binding.dataSourceId);
    if (!dataSource) {
      throw new Error(`data binding references missing data source: ${binding.dataSourceId}`);
    }
    const fields = new Set(dataSource.fields);
    for (const sourceField of Object.values(binding.fieldMap)) {
      if (!fields.has(sourceField)) {
        throw new Error(`Data binding references missing source field: ${sourceField}`);
      }
    }
    const object = assertCanvasObject(bundle, binding.targetObjectId, "Data binding");
    if (binding.targetNodeId) {
      if (!bundle.editGraph.nodes[binding.targetNodeId]) {
        throw new Error(`Data binding references missing edit node: ${binding.targetNodeId}`);
      }
      if (object.nodeId && object.nodeId !== binding.targetNodeId) {
        throw new Error(`Data binding target node does not match canvas object: ${binding.id}`);
      }
    }
    if (binding.sourceRevision !== bundle.baseRevision) {
      throw new Error(`Data binding source revision is stale: ${binding.id}`);
    }
  }
  for (const event of bundle.assetLifecycle) {
    assertAsset(assetIds, event.assetId, "Asset lifecycle");
    if (event.sourceId) {
      assertSource(sourceIds, event.sourceId, "Asset lifecycle");
    }
    if (event.previousAssetId) {
      assertAsset(assetIds, event.previousAssetId, "Asset lifecycle previous asset");
    }
    if (event.nextAssetId) {
      assertAsset(assetIds, event.nextAssetId, "Asset lifecycle next asset");
    }
  }
  for (const item of bundle.projectAssetUrls) {
    assertAsset(assetIds, item.assetId, "Project asset URL");
    if (item.url !== `kdesign://asset/${encodeURIComponent(bundle.id)}/${encodeURIComponent(item.assetId)}`) {
      throw new Error(`Project asset URL mismatches asset id: ${item.assetId}`);
    }
  }
  if (bundle.syncEnvelope) {
    const diagnostics = validateSyncEnvelope(bundle, bundle.syncEnvelope);
    if (diagnostics.length > 0) {
      throw new Error(`sync envelope validation failed: ${diagnostics.join(", ")}`);
    }
  }
}

function hasSourceEvidence(source: ProjectBundle["sourceRecords"][number]): boolean {
  if (source.kind === "url" || source.kind === "webCapture") {
    return Boolean(source.sourceUrl);
  }
  const hasDiagnosticEvidence = source.diagnostics.some((diagnostic) => (
      diagnostic.startsWith("inline-source-bytes") ||
      diagnostic.startsWith("deterministic-fixture") ||
      diagnostic.startsWith("unsupported-source-type") ||
      diagnostic.startsWith("blocked-url")
  ));
  return Boolean((source.sourceUrl || source.localPath || hasDiagnosticEvidence) && (source.mimeType || hasDiagnosticEvidence));
}

function assertSourceStatus(source: ProjectBundle["sourceRecords"][number]): void {
  if (source.parseStatus === "blocked" && source.usageStatus !== "blocked") {
    throw new Error(`Blocked source must have blocked usage status: ${source.id}`);
  }
  if (source.usageStatus === "blocked" && source.parseStatus !== "blocked") {
    throw new Error(`Blocked usage source must have blocked parse status: ${source.id}`);
  }
  if (source.parseStatus === "failed" && ["approved", "used"].includes(source.usageStatus)) {
    throw new Error(`Failed source cannot be approved or used: ${source.id}`);
  }
  if (["approved", "used"].includes(source.usageStatus) && !["parsed", "partial"].includes(source.parseStatus)) {
    throw new Error(`Used source must be parsed or partial: ${source.id}`);
  }
}

function assertPrototypeIntegrity(bundle: ProjectBundle): void {
  const graph = bundle.prototypeGraph;
  if (!graph) {
    return;
  }

  const variableIds = new Set(graph.variables.map((variable) => variable.id));
  const componentIds = new Set(Object.keys(bundle.canvasGraph?.components ?? {}));

  for (const variable of graph.variables) {
    if (variable.sharedComponentId && !componentIds.has(variable.sharedComponentId)) {
      throw new Error(`Prototype variable references missing shared component: ${variable.sharedComponentId}`);
    }
  }

  for (const interaction of graph.interactions) {
    assertPrototypeInteractionIntegrity(bundle, interaction);
  }

  for (const rule of graph.stateRules) {
    const component = bundle.canvasGraph?.components[rule.componentId];
    if (!component) {
      throw new Error(`Prototype state rule references missing component: ${rule.componentId}`);
    }
    if (rule.variantId && !component.variants.some((variant) => variant.id === rule.variantId)) {
      throw new Error(`Prototype state rule references missing component variant: ${rule.variantId}`);
    }
    for (const variableId of Object.keys(rule.variableBindings)) {
      assertKnownVariable(variableIds, variableId, "Prototype state rule");
    }
    assertKnownConditions(variableIds, rule.conditions, "Prototype state rule");
  }
}

export function assertPrototypeInteractionIntegrity(
  bundle: ProjectBundle,
  interaction: PrototypeInteraction
): void {
  const variableIds = new Set(bundle.prototypeGraph?.variables.map((variable) => variable.id) ?? []);
  assertCanvasObject(bundle, interaction.sourceObjectId, "Prototype interaction source");
  if (interaction.targetObjectId) {
    assertCanvasObject(bundle, interaction.targetObjectId, "Prototype interaction target");
  }
  if (interaction.trigger === "keyboard" && !isSafeKey(interaction.key)) {
    throw new Error("Prototype keyboard interaction requires a safe key.");
  }
  if (interaction.trigger === "timed" && (!interaction.delayMs || interaction.delayMs <= 0)) {
    throw new Error("Prototype timed interaction requires delayMs > 0.");
  }
  if ((interaction.action === "setVariable" || interaction.action === "toggleVariable") && !interaction.variableId) {
    throw new Error("Prototype variable action requires variableId.");
  }
  if (interaction.variableId) {
    assertKnownVariable(variableIds, interaction.variableId, "Prototype interaction");
  }
  if (interaction.action === "setComponentState" && !COMPONENT_STATES.has(String(interaction.value ?? "default"))) {
    throw new Error(`Prototype interaction has invalid component state: ${String(interaction.value)}`);
  }
  assertKnownConditions(variableIds, interaction.conditions, "Prototype interaction");
}

function assertPresentationIntegrity(bundle: ProjectBundle): void {
  if (!bundle.presentationState) {
    return;
  }
  assertPresentationStateIntegrity(bundle, bundle.presentationState);
}

export function assertPresentationStateIntegrity(bundle: ProjectBundle, state: PresentationState): void {
  const variableIds = new Set(bundle.prototypeGraph?.variables.map((variable) => variable.id) ?? []);
  const interactionIds = new Set(bundle.prototypeGraph?.interactions.map((interaction) => interaction.id) ?? []);

  if (state.activeObjectId) {
    assertCanvasObject(bundle, state.activeObjectId, "Presentation active object");
  }
  if (state.activeSlideId) {
    assertSlideExists(bundle, state.activeSlideId, "Presentation active slide");
  }
  if (state.activeInteractionId && !interactionIds.has(state.activeInteractionId)) {
    throw new Error(`Presentation state references missing interaction: ${state.activeInteractionId}`);
  }
  for (const variableId of Object.keys(state.variableValues)) {
    assertKnownVariable(variableIds, variableId, "Presentation state");
  }
  for (const objectId of Object.keys(state.componentStates)) {
    assertCanvasObject(bundle, objectId, "Presentation component state");
  }
  for (const interactionId of state.history) {
    if (!interactionIds.has(interactionId)) {
      throw new Error(`Presentation history references missing interaction: ${interactionId}`);
    }
  }
}

function assertSlideDeckIntegrity(bundle: ProjectBundle): void {
  const interactionIds = new Set(bundle.prototypeGraph?.interactions.map((interaction) => interaction.id) ?? []);

  for (const deck of bundle.slideDecks) {
    const slideIds = new Set(deck.slides.map((slide) => slide.id));
    if (deck.activeSlideId && !slideIds.has(deck.activeSlideId)) {
      throw new Error(`Slide deck references missing active slide: ${deck.activeSlideId}`);
    }

    for (const slide of deck.slides) {
      const blockIds = new Set(slide.blocks.map((block) => block.id));
      const pollIds = new Set(slide.feedback.filter((item) => item.kind === "poll").map((item) => item.id));
      for (const block of slide.blocks) {
        assertSlideBlockIntegrity(bundle, interactionIds, block);
      }
      for (const feedback of slide.feedback) {
        assertSlideFeedbackIntegrity(blockIds, pollIds, feedback);
      }
    }
  }
}

function assertSlideBlockIntegrity(
  bundle: ProjectBundle,
  interactionIds: Set<string>,
  block: SlideBlock
): void {
  if (block.kind === "canvasObject") {
    if (!block.objectId) {
      throw new Error(`Slide block requires canvas object id: ${block.id}`);
    }
    assertCanvasObject(bundle, block.objectId, "Slide block");
  }
  if (block.kind === "prototypeBlock") {
    if (!block.interactionId || !interactionIds.has(block.interactionId)) {
      throw new Error(`Slide block references missing prototype interaction: ${block.interactionId ?? ""}`);
    }
  }
}

function assertSlideFeedbackIntegrity(
  blockIds: Set<string>,
  pollIds: Set<string>,
  feedback: SlideFeedback
): void {
  if (feedback.kind === "poll" && (feedback.choices.length < 2 || feedback.choices.length > 6)) {
    throw new Error(`Slide poll feedback requires 2-6 choices: ${feedback.id}`);
  }
  if (feedback.kind === "alignment" && (!Number.isInteger(feedback.value) || feedback.value! < 1 || feedback.value! > 5)) {
    throw new Error(`Slide alignment feedback requires value 1-5: ${feedback.id}`);
  }
  if (feedback.kind === "vote") {
    if (!feedback.targetId || (!blockIds.has(feedback.targetId) && !pollIds.has(feedback.targetId))) {
      throw new Error(`Slide vote feedback references missing target: ${feedback.targetId ?? ""}`);
    }
  }
}

function assertVariationIntegrity(bundle: ProjectBundle): void {
  for (const set of bundle.variationSets) {
    assertCanvasObject(bundle, set.targetObjectId, "Variation set");
    if (set.promotedDirectionId && !set.directions.some((direction) => direction.id === set.promotedDirectionId)) {
      throw new Error(`Variation set references missing promoted direction: ${set.promotedDirectionId}`);
    }
    for (const direction of set.directions) {
      assertVariationDirectionIntegrity(bundle, set, direction);
    }
  }
}

function assertVariationDirectionIntegrity(
  bundle: ProjectBundle,
  set: VariationSet,
  direction: VariationDirection
): void {
  if (direction.targetObjectId !== set.targetObjectId) {
    throw new Error(`Variation direction target does not match selected object: ${direction.id}`);
  }
  const target = assertCanvasObject(bundle, direction.targetObjectId, "Variation direction");
  for (const operation of direction.operations) {
    assertVariationOperationIntegrity(bundle, set, direction, operation);
  }
  for (const patch of direction.patches) {
    if (!target.nodeId || patch.nodeId !== target.nodeId) {
      throw new Error(`Variation patch must stay scoped to the selected node: ${patch.id}`);
    }
    if (!bundle.editGraph.nodes[patch.nodeId]) {
      throw new Error(`Variation patch references missing edit node: ${patch.nodeId}`);
    }
    if (patch.baseRevision !== set.sourceRevision) {
      throw new Error(`Variation patch revision does not match source revision: ${patch.id}`);
    }
  }
  if (isAgentOutputProvenance(direction.provenance)) {
    const diagnostics = validateAgentDirectionSafety({
      targetObjectId: set.targetObjectId,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      sourceRevision: set.sourceRevision,
      operations: direction.operations,
      patches: direction.patches,
      createdAt: direction.createdAt
    });
    if (diagnostics.length > 0) {
      throw new Error(`Agent variation direction failed persisted validation: ${formatDiagnosticCodes(diagnostics)}`);
    }
  }
}

function assertVariationOperationIntegrity(
  bundle: ProjectBundle,
  set: VariationSet,
  direction: VariationDirection,
  operation: CanvasOperation
): void {
  assertCanvasObject(bundle, operation.objectId, "Variation operation");
  if (operation.objectId !== direction.targetObjectId) {
    throw new Error(`Variation operation must stay scoped to the selected object: ${operation.id}`);
  }
  if (operation.baseRevision !== set.sourceRevision) {
    throw new Error(`Variation operation revision does not match source revision: ${operation.id}`);
  }
}

function assertAgentRecipeIntegrity(bundle: ProjectBundle): void {
  const operationIds = new Set([
    ...bundle.canvasOperations.map((operation) => operation.id),
    ...bundle.patches.map((patch) => patch.id),
    ...bundle.variationSets.flatMap((set) => set.directions.flatMap((direction) => [
      ...direction.operations.map((operation) => operation.id),
      ...direction.patches.map((patch) => patch.id)
    ]))
  ]);

  for (const recipe of bundle.agentRecipes) {
    assertAgentRecipeRefs(bundle, recipe, operationIds);
  }
}

function assertAgentRecipeRefs(
  bundle: ProjectBundle,
  recipe: AgentRecipe,
  operationIds: Set<string>
): void {
  assertCanvasObject(bundle, recipe.targetObjectId, "Agent recipe");
  const set = recipe.variationSetId
    ? bundle.variationSets.find((item) => item.id === recipe.variationSetId)
    : undefined;
  if (recipe.variationSetId && !set) {
    throw new Error(`Agent recipe references missing variation set: ${recipe.variationSetId}`);
  }
  if (recipe.directionId) {
    const directionExists = set
      ? set.directions.some((direction) => direction.id === recipe.directionId)
      : bundle.variationSets.some((item) => item.directions.some((direction) => direction.id === recipe.directionId));
    if (!directionExists) {
      throw new Error(`Agent recipe references missing variation direction: ${recipe.directionId}`);
    }
  }
  for (const operationId of recipe.operationIds) {
    if (!operationIds.has(operationId)) {
      throw new Error(`Agent recipe references missing operation id: ${operationId}`);
    }
  }
}

function assertAgentContextPackageIntegrity(bundle: ProjectBundle): void {
  for (const contextPackage of bundle.agentContextPackages) {
    assertAgentContextPackageRefs(bundle, contextPackage);
  }
}

function assertAgentContextPackageRefs(bundle: ProjectBundle, contextPackage: AgentContextPackage): void {
  assertCanvasObject(bundle, contextPackage.targetObjectId, "Agent context package");
  if (contextPackage.selectedObject.id !== contextPackage.targetObjectId) {
    throw new Error(`Agent context selected object does not match target: ${contextPackage.id}`);
  }
}

function assertAgentOutputIntegrity(bundle: ProjectBundle): void {
  const contextPackages = new Map(bundle.agentContextPackages.map((contextPackage) => [contextPackage.id, contextPackage]));
  for (const output of bundle.agentOutputs) {
    assertAgentOutputRefs(bundle, contextPackages, output);
  }
}

function assertAgentOutputRefs(
  bundle: ProjectBundle,
  contextPackages: Map<string, AgentContextPackage>,
  output: AgentOutputEnvelope
): void {
  const contextPackage = contextPackages.get(output.contextPackageId);
  if (!contextPackage) {
    throw new Error(`Agent output references missing context package: ${output.contextPackageId}`);
  }
  if (output.targetObjectId !== contextPackage.targetObjectId) {
    throw new Error(`Agent output target does not match context package: ${output.id}`);
  }
  if (output.sourceRevision !== contextPackage.sourceRevision) {
    throw new Error(`Agent output revision does not match context package: ${output.id}`);
  }
  const target = assertCanvasObject(bundle, output.targetObjectId, "Agent output");
  for (const direction of output.directions) {
    if (direction.targetObjectId !== output.targetObjectId) {
      throw new Error(`Agent output direction target does not match output target: ${direction.id}`);
    }
    for (const operation of direction.operations) {
      assertCanvasObject(bundle, operation.objectId, "Agent output operation");
      if (operation.objectId !== output.targetObjectId) {
        throw new Error(`Agent output operation must stay scoped to selected object: ${operation.id}`);
      }
      if (operation.baseRevision !== output.sourceRevision) {
        throw new Error(`Agent output operation revision does not match source revision: ${operation.id}`);
      }
    }
    for (const patch of direction.patches) {
      if (!target.nodeId || patch.nodeId !== target.nodeId) {
        throw new Error(`Agent output patch must stay scoped to selected node: ${patch.id}`);
      }
      if (!bundle.editGraph.nodes[patch.nodeId]) {
        throw new Error(`Agent output patch references missing edit node: ${patch.nodeId}`);
      }
      if (patch.baseRevision !== output.sourceRevision) {
        throw new Error(`Agent output patch revision does not match source revision: ${patch.id}`);
      }
    }
  }
  const diagnostics = validateAgentOutputScope(bundle, contextPackage, output);
  if (diagnostics.length > 0) {
    throw new Error(`Agent output failed persisted validation: ${formatDiagnosticCodes(diagnostics)}`);
  }
}

function assertAgentRunIntegrity(bundle: ProjectBundle): void {
  const contextPackages = new Map(bundle.agentContextPackages.map((contextPackage) => [contextPackage.id, contextPackage]));
  const outputs = new Map(bundle.agentOutputs.map((output) => [output.id, output]));
  for (const run of bundle.agentRuns) {
    assertAgentRunRefs(bundle, contextPackages, outputs, run);
  }
}

function assertAgentRunRefs(
  bundle: ProjectBundle,
  contextPackages: Map<string, AgentContextPackage>,
  outputs: Map<string, AgentOutputEnvelope>,
  run: AgentRun
): void {
  assertCanvasObject(bundle, run.targetObjectId, "Agent run");
  const contextPackage = contextPackages.get(run.contextPackageId);
  if (!contextPackage) {
    throw new Error(`Agent run references missing context package: ${run.contextPackageId}`);
  }
  if (run.targetObjectId !== contextPackage.targetObjectId) {
    throw new Error(`Agent run target does not match context package: ${run.id}`);
  }
  if (run.sourceRevision !== contextPackage.sourceRevision) {
    throw new Error(`Agent run revision does not match context package: ${run.id}`);
  }
  if (run.outputId) {
    const output = outputs.get(run.outputId);
    if (!output) {
      throw new Error(`Agent run references missing output id: ${run.outputId}`);
    }
    if (run.runtime !== output.runtime) {
      throw new Error(`Agent run runtime does not match output runtime: ${run.id}`);
    }
    if (run.contextPackageId !== output.contextPackageId) {
      throw new Error(`Agent run context does not match output context: ${run.id}`);
    }
    if (run.targetObjectId !== output.targetObjectId) {
      throw new Error(`Agent run target does not match output target: ${run.id}`);
    }
    if (run.sourceRevision !== output.sourceRevision) {
      throw new Error(`Agent run revision does not match output revision: ${run.id}`);
    }
  }
}

function assertPhase10Integrity(bundle: ProjectBundle): void {
  const revisionIds = new Set([bundle.baseRevision, ...bundle.versions.map((version) => version.id)]);
  const tokenIds = new Set(bundle.designSystem?.tokens.map((token) => token.id) ?? []);
  const assetIds = new Set(bundle.assets.map((asset) => asset.id));
  const assetUrls = new Set(bundle.projectAssetUrls.map((item) => item.url));
  const sourceIds = new Set(bundle.sourceRecords.map((source) => source.id));
  const jobIds = new Set(bundle.exportJobs.map((job) => job.id));
  const artifactIds = new Set(bundle.exportArtifacts.map((artifact) => artifact.id));
  const packageIds = new Set(bundle.codeRoundtripPackages.map((item) => item.id));

  for (const report of bundle.devModeReports) {
    assertDevModeReportIntegrity(bundle, tokenIds, assetIds, report);
  }
  for (const snippet of bundle.devCodeSnippets) {
    assertDevCodeSnippetIntegrity(bundle, snippet);
  }
  for (const marker of bundle.readyForDevMarkers) {
    assertReadyForDevMarkerIntegrity(bundle, marker);
  }
  for (const diff of bundle.versionDiffs) {
    assertVersionDiffIntegrity(bundle, revisionIds, diff);
  }
  for (const download of bundle.assetDownloads) {
    assertAssetDownloadIntegrity(assetIds, assetUrls, sourceIds, download);
  }
  for (const artifact of bundle.exportArtifacts) {
    assertExportArtifactIntegrity(revisionIds, jobIds, artifact);
  }
  for (const verification of bundle.exportVerifications) {
    assertExportVerificationIntegrity(artifactIds, verification);
  }
  for (const preview of bundle.publishPreviews) {
    assertPublishPreviewIntegrity(revisionIds, artifactIds, preview);
  }
  for (const roundtripPackage of bundle.codeRoundtripPackages) {
    assertCodeRoundtripPackageIntegrity(revisionIds, artifactIds, roundtripPackage);
  }
  for (const roundtripImport of bundle.codeRoundtripImports) {
    assertCodeRoundtripImportIntegrity(bundle, revisionIds, packageIds, roundtripImport);
  }
}

function assertDevModeReportIntegrity(
  bundle: ProjectBundle,
  tokenIds: Set<string>,
  assetIds: Set<string>,
  report: DevModeInspectReport
): void {
  const object = assertCanvasObject(bundle, report.objectId, "Dev Mode report");
  assertNodeMatchesObject(bundle, object, report.nodeId, "Dev Mode report");
  if (report.measurement.objectId !== report.objectId) {
    throw new Error(`Dev Mode measurement object mismatch: ${report.id}`);
  }
  assertNodeMatchesObject(bundle, object, report.measurement.nodeId, "Dev Mode measurement");
  for (const token of report.tokenReferences) {
    if (!tokenIds.has(token.tokenId)) {
      throw new Error(`Dev Mode report references missing token: ${token.tokenId}`);
    }
  }
  for (const assetId of report.assetIds) {
    assertAsset(assetIds, assetId, "Dev Mode report");
  }
}

function assertDevCodeSnippetIntegrity(
  bundle: ProjectBundle,
  snippet: DevCodeSnippet
): void {
  const object = assertCanvasObject(bundle, snippet.objectId, "Dev code snippet");
  assertNodeMatchesObject(bundle, object, snippet.nodeId, "Dev code snippet");
}

function assertReadyForDevMarkerIntegrity(
  bundle: ProjectBundle,
  marker: ReadyForDevMarker
): void {
  const object = assertCanvasObject(bundle, marker.objectId, "Ready-for-dev marker");
  assertNodeMatchesObject(bundle, object, marker.nodeId, "Ready-for-dev marker");
}

function assertVersionDiffIntegrity(
  bundle: ProjectBundle,
  revisionIds: Set<string>,
  diff: VersionDiffRecord
): void {
  void revisionIds;
  for (const objectId of diff.objectIds) {
    assertCanvasObject(bundle, objectId, "Version diff");
  }
  for (const change of diff.changes) {
    const object = assertCanvasObject(bundle, change.objectId, "Version diff change");
    assertNodeMatchesObject(bundle, object, change.nodeId, "Version diff change");
  }
}

function assertAssetDownloadIntegrity(
  assetIds: Set<string>,
  assetUrls: Set<string>,
  sourceIds: Set<string>,
  download: AssetDownloadRecord
): void {
  assertAsset(assetIds, download.assetId, "Asset download");
  if (!assetUrls.has(download.url)) {
    throw new Error(`Asset download requires stored project URL: ${download.assetId}`);
  }
  if (download.sourceId) {
    assertSource(sourceIds, download.sourceId, "Asset download");
  }
}

function assertExportArtifactIntegrity(
  revisionIds: Set<string>,
  jobIds: Set<string>,
  artifact: ExportArtifact
): void {
  if (!jobIds.has(artifact.jobId)) {
    throw new Error(`Export artifact references missing job: ${artifact.jobId}`);
  }
  assertKnownRevision(revisionIds, artifact.sourceRevision, "Export artifact");
}

function assertExportVerificationIntegrity(artifactIds: Set<string>, verification: ExportVerification): void {
  if (!artifactIds.has(verification.artifactId)) {
    throw new Error(`Export verification references missing artifact: ${verification.artifactId}`);
  }
}

function assertPublishPreviewIntegrity(
  revisionIds: Set<string>,
  artifactIds: Set<string>,
  preview: PublishPreview
): void {
  assertKnownRevision(revisionIds, preview.sourceRevision, "Publish preview");
  for (const artifactId of preview.artifactIds) {
    if (!artifactIds.has(artifactId)) {
      throw new Error(`Publish preview references missing artifact: ${artifactId}`);
    }
  }
}

function assertCodeRoundtripPackageIntegrity(
  revisionIds: Set<string>,
  artifactIds: Set<string>,
  roundtripPackage: CodeRoundtripPackage
): void {
  assertKnownRevision(revisionIds, roundtripPackage.sourceRevision, "Code roundtrip package");
  for (const artifactId of roundtripPackage.artifactIds) {
    if (!artifactIds.has(artifactId)) {
      throw new Error(`Code roundtrip package references missing artifact: ${artifactId}`);
    }
  }
}

function assertCodeRoundtripImportIntegrity(
  bundle: ProjectBundle,
  revisionIds: Set<string>,
  packageIds: Set<string>,
  roundtripImport: CodeRoundtripImport
): void {
  if (!packageIds.has(roundtripImport.packageId)) {
    throw new Error(`Code roundtrip import references missing package: ${roundtripImport.packageId}`);
  }
  const roundtripPackage = bundle.codeRoundtripPackages.find((item) => item.id === roundtripImport.packageId);
  if (roundtripPackage && roundtripImport.runtime !== roundtripPackage.runtime) {
    throw new Error(`Code roundtrip import runtime does not match package: ${roundtripImport.id}`);
  }
  if (roundtripImport.status === "validated") {
    assertKnownRevision(revisionIds, roundtripImport.sourceRevision, "Code roundtrip import");
  }
  const patchIds = new Set(bundle.patches.map((patch) => patch.id));
  const operationIds = new Set(bundle.canvasOperations.map((operation) => operation.id));
  for (const patchId of roundtripImport.patchIds) {
    if (!patchIds.has(patchId)) {
      throw new Error(`Code roundtrip import references missing patch: ${patchId}`);
    }
  }
  for (const operationId of roundtripImport.operationIds) {
    if (!operationIds.has(operationId)) {
      throw new Error(`Code roundtrip import references missing operation: ${operationId}`);
    }
  }
}

function isAgentOutputProvenance(provenance: string): boolean {
  return provenance.startsWith("agent-output:");
}

function formatDiagnosticCodes(diagnostics: { code: string }[]): string {
  return diagnostics.map((diagnostic) => diagnostic.code).join(", ");
}

function assertCanvasObject(bundle: ProjectBundle, objectId: string, label: string) {
  const object = bundle.canvasGraph?.objects[objectId];
  if (!object) {
    throw new Error(`${label} references missing canvas object: ${objectId}`);
  }
  return object;
}

function assertNodeMatchesObject(
  bundle: ProjectBundle,
  object: NonNullable<ProjectBundle["canvasGraph"]>["objects"][string],
  nodeId: string | undefined,
  label: string
): void {
  if (!nodeId) {
    return;
  }
  if (!bundle.editGraph.nodes[nodeId]) {
    throw new Error(`${label} references missing edit node: ${nodeId}`);
  }
  if (object.nodeId && object.nodeId !== nodeId) {
    throw new Error(`${label} node does not match canvas object: ${nodeId}`);
  }
}

function assertKnownRevision(revisionIds: Set<string>, revision: string, label: string): void {
  if (!revisionIds.has(revision)) {
    throw new Error(`${label} references missing revision: ${revision}`);
  }
}

function assertSource(sourceIds: Set<string>, sourceId: string, label: string): void {
  if (!sourceIds.has(sourceId)) {
    throw new Error(`${label} references missing source: ${sourceId}`);
  }
}

function assertAsset(assetIds: Set<string>, assetId: string, label: string): void {
  if (!assetIds.has(assetId)) {
    throw new Error(`${label} references missing asset: ${assetId}`);
  }
}

function assertSlideExists(bundle: ProjectBundle, slideId: string, label: string): void {
  if (!bundle.slideDecks.some((deck) => deck.slides.some((slide) => slide.id === slideId))) {
    throw new Error(`${label} references missing slide: ${slideId}`);
  }
}

function assertKnownVariable(variableIds: Set<string>, variableId: string, label: string): void {
  if (!variableIds.has(variableId)) {
    throw new Error(`${label} references missing prototype variable: ${variableId}`);
  }
}

function assertKnownConditions(
  variableIds: Set<string>,
  conditions: PrototypeCondition[],
  label: string
): void {
  for (const condition of conditions) {
    assertKnownVariable(variableIds, condition.variableId, label);
  }
}

function isSafeKey(key: string | undefined): boolean {
  return Boolean(key?.trim()) && !/[<>"';]/.test(key!) && !/javascript:/i.test(key!);
}
