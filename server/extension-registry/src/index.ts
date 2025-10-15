// TODO: Replace d1 with other methods of storing artifact
// Use it for now to make prototyping easier

// For now, we provide three basic endpoints
// POST /publish -> accept metadata (JSON) + .tar.gz file (multipart/form-data)
// GET /extensions -> list all registered extensions and metadata
// GET /extensions/:eid -> list all registered versions of an extension
// GET /download/:aid -> download a specific accepted-version artifact by artifact_id


// TODO: Authentication

interface Env {
	db: D1Database;
}

interface VersionInfo {
	verMajor: number;
	verMinor: number;
	verPatch: number;
	minAppMajor: number;
	minAppMinor: number;
	minAppPatch: number;
}

interface PublishMetadata extends VersionInfo{
	extensionId: string;
	name: string;
	authors: string[];
	description: string;
	repository: string;
}

interface ExtensionInfo {
	extensionId: string;
	name: string;
	authors: string[];
	description: string;
	repository: string;
	downloads: number;
	createdAt: string;
	updatedAt: string;
}

interface ArtifactInfo extends VersionInfo{
	artifactId: number;
	extensionId: string;
	publishedAt: string;
}

const requiredPublishMetadataFields = [
	"extensionId",
	"name",
	"repository",
	"verMajor",
	"verMinor",
	"verPatch",
	"minAppMajor",
	"minAppMinor",
	"minAppPatch"
]


function jsonResponse(status: number, payload: unknown) {
	return new Response(JSON.stringify(payload, null, 2), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

async function ensureSchema(db: D1Database) {
	await db.prepare(`CREATE TABLE IF NOT EXISTS extensions (
		extension_id TEXT NOT NULL,
		name TEXT NOT NULL,
		authors TEXT NOT NULL,
		description TEXT NOT NULL,
		repository TEXT NOT NULL,
		downloads INTEGER NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		CONSTRAINT Extensions_PK PRIMARY KEY (extension_id)
	);`).run();
	await db.prepare(`CREATE TABLE IF NOT EXISTS extension_artifacts (
    artifact_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    extension_id TEXT NOT NULL,
    ver_major INTEGER NOT NULL,
    ver_minor INTEGER NOT NULL,
    ver_patch INTEGER NOT NULL,
    min_app_major INTEGER NOT NULL,
    min_app_minor INTEGER NOT NULL,
    min_app_patch INTEGER NOT NULL,
    published_at TEXT NOT NULL,
    artifact BLOB NOT NULL,
    ver_rank as (ver_major*1000000 + ver_minor*1000 + ver_patch),
    min_app_rank as (min_app_major*1000000 + min_app_minor*1000 + min_app_patch),
    CONSTRAINT extension_versions_extensions_FK FOREIGN KEY (extension_id) REFERENCES extensions(extension_id) ON DELETE CASCADE
	);`).run();
}

async function handlePublish(request: Request, env: Env) {
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.startsWith('multipart/form-data')) {
		return jsonResponse(400, { error: 'Content-Type must be multipart/form-data' });
	}

	const form = await request.formData();
	const metadataVal = form.get('metadata');
	const fileVal = form.get('file');

	if (!metadataVal) return jsonResponse(400, { error: 'missing "metadata" form field (JSON)' });
	if (typeof metadataVal != 'string') {
		return jsonResponse(400, {error : '"metadata" form field must be text (JSON)'})
	}


	if (!fileVal) return jsonResponse(400, { error: 'missing "file" form field (binary .tar.gz)' });
	if (!(fileVal instanceof File)) {
		return jsonResponse(400, {error: '"file" form field must be file (binary .tar.gz'});
	}

	let metadata: PublishMetadata;
	try {
		metadata = JSON.parse(metadataVal) as PublishMetadata;
	} catch (err) {
		return jsonResponse(400, { error: 'invalid JSON in metadata', details: String(err) });
	}

	console.log(metadata.authors)
	for (const r of requiredPublishMetadataFields) {
		if (!(metadata.hasOwnProperty(r) ) || (metadata as any)[r] == null) {
			return jsonResponse(400, { error: `metadata.${r} is required` });
		}
	}

	const db = env.db;
	await ensureSchema(db);

	const now = new Date();
	const isoString = now.toISOString();

	const stmt1 = db.prepare(`INSERT INTO extensions 
		(extension_id, name, authors, description, repository, downloads, created_at, updated_at) VALUES
		(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (extension_id) DO UPDATE SET
		name = excluded.name,
		authors = excluded.authors,
		description = excluded.description,
		repository = excluded.repository,
		updated_at = excluded.updated_at;
		`).bind(
		metadata.extensionId,
		metadata.name,
		JSON.stringify(metadata.authors),
		metadata.description,
		metadata.repository,
		0,
		isoString,
		isoString
	);

	const blob = await fileVal.arrayBuffer();
	console.log(blob)
	const stmt2 = db.prepare(`INSERT INTO extension_artifacts
		(extension_id, ver_major, ver_minor, ver_patch, min_app_major, min_app_minor, min_app_patch, published_at, artifact) VALUES
		(?, ?, ?, ?, ?, ?, ?, ?, ?);`).bind(
		metadata.extensionId,
		metadata.verMajor,
		metadata.verMinor,
		metadata.verPatch,
		metadata.minAppMajor,
		metadata.minAppMinor,
		metadata.minAppPatch,
		isoString,
		blob
	);

	await db.batch([
		stmt1,
		stmt2
	]);


	return jsonResponse(201, {message: `Successfully published ${metadata.extensionId}, version ${metadata.verMajor}.${metadata.verMinor}.${metadata.verPatch}`});
}

async function handleListExtensions(request: Request, env: Env) {
	const db = env.db;
	await ensureSchema(db);

	const rows = await db.prepare(
		`SELECT extension_id, name, authors, description, repository, downloads, created_at, updated_at FROM extensions;`).all();
	const extensions: ExtensionInfo[] = rows.results.map(row => {
		return {
			extensionId: row["extension_id"] as string,
			name: row["name"] as string,
			authors: JSON.parse(<string>row["authors"]) as string[],
			description: row["description"] as string,
			repository: row["repository"] as string,
			downloads: row["downloads"] as number,
			createdAt: row["created_at"] as string,
			updatedAt: row["updated_at"] as string
		}
	});

	return jsonResponse(200, {extensions})
}

async function handleListArtifacts(request: Request, env: Env, extensionId: string) {
	const db = env.db;
	await ensureSchema(db);

	const rows = await db.prepare(
		`SELECT artifact_id, extension_id, ver_major, ver_minor, ver_patch, min_app_major, min_app_minor, min_app_patch, published_at FROM extension_artifacts
		WHERE extension_id = ?;`
	).bind(extensionId).all();

	const artifacts: ArtifactInfo[] = rows.results.map(row => {
		return {
			artifactId: row["artifact_id"] as number,
			extensionId: row["extension_id"] as string,
			verMajor: row["ver_major"] as number,
			verMinor: row["ver_minor"] as number,
			verPatch: row["ver_patch"] as number,
			minAppMajor: row["min_app_major"] as number,
			minAppMinor: row["min_app_minor"] as number,
			minAppPatch: row["min_app_patch"] as number,
			publishedAt: row["published_at"] as string
		}
	});

	return jsonResponse(200, {artifacts})
}

async function handleDownloadArtifact(request: Request, env: Env, artifactId: number) {
	const db = env.db;
	await ensureSchema(db);

	const row = await db.prepare(
		`SELECT extension_id, artifact, ver_major, ver_minor, ver_patch FROM extension_artifacts WHERE artifact_id = ? LIMIT 1;`)
		.bind(artifactId).first();
	if (!row) {
		return jsonResponse(404, {"error": `Artifact ${artifactId} not found`});
	}

	console.log(row)


	const headers = new Headers();
	headers.set('Content-Type', 'application/gzip');
	const filename = `${row["extension_id"]}-${row["ver_major"]}-${row["ver_minor"]}-${row["ver_patch"]}.tar.gz`;
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);

	const blob = row["artifact"] as number[]

	return new Response(new Uint8Array(blob), { status: 200, headers });
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname.replace(/\/+$/, '');

		try {
			if (request.method == "POST" && pathname == "/publish") {
				return await handlePublish(request, env);
			}
			if (request.method == "GET" && pathname.startsWith("/extensions")) {
				const parts = pathname.split("/");
				const extensionId = parts[2];
				if (!extensionId) {
					return await handleListExtensions(request, env);
				} else {
					return await handleListArtifacts(request, env, extensionId);
				}
			}
			if (request.method == "GET" && pathname.startsWith("/download")) {
				const parts = pathname.split("/");
				const artifactIdStr = parts[2];
				if (!artifactIdStr) {
					return jsonResponse(400, { error: "missing artifact id"});
				}
				const artifactId = parseInt(artifactIdStr);
				if (isNaN(artifactId)) {
					return jsonResponse(400, { error: "invalid artifact id"});
				}
				return await handleDownloadArtifact(request, env, artifactId);
			}
			return jsonResponse(404, { error: 'not found' });
		} catch (err) {
			return jsonResponse(500, { error: 'internal server error', details: String(err) });
		}
	},
} satisfies ExportedHandler<Env>;
