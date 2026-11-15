// The search index, one static JSON file per language (fetched when search first opens).
import type { APIRoute } from 'astro';
import { LANGS, type Lang } from '../../lib/universe';
import { searchIndex } from '../../lib/searchIndex';

export const getStaticPaths = () => LANGS.map((lang) => ({ params: { lang } }));
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(searchIndex(params.lang as Lang)), { headers: { 'content-type': 'application/json; charset=utf-8' } });
