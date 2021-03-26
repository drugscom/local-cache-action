# Local artefact cache

This action stores and restores cached artefact from local storage.

## Inputs

### `force-save`

Force saving artifacts cache even if a previously cached entry was found. Default `"false"`.

### `load-paths`

An ordered list of paths to use for restoring the cache if no cache hit occurred for save-path.

### `path`

A list of files, directories, and wildcard patterns to load from the cache.

### `save-path`

An explicit path for storing the artifact cache.

## Outputs

### `cache-hit`

Artefact found and loaded from cache.

## Example usage

```yaml
uses: drugscom/local-cache-action@v1
with:
  path: node-modules
  key: ${{ hashFiles('package.json', 'package-lock.json') }}
```
