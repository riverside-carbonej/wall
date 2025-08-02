import { Injectable } from '@angular/core';
import { Observable, from, throwError, combineLatest, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';
import { RelationshipDefinition, WallObjectType, EnhancedWallItem } from '../../../shared/models/wall.model';

export interface ObjectRelationship {
  id: string;
  wallId: string;
  fromItemId: string;
  toItemId: string;
  relationshipDefinitionId: string;
  metadata?: { [key: string]: any };
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface RelationshipPath {
  fromItem: EnhancedWallItem;
  toItem: EnhancedWallItem;
  relationship: ObjectRelationship;
  definition: RelationshipDefinition;
}

export interface RelationshipGraph {
  items: EnhancedWallItem[];
  relationships: RelationshipPath[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  item: EnhancedWallItem;
  x?: number;
  y?: number;
  connections: number;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  relationship: RelationshipPath;
  bidirectional: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RelationshipService {
  private readonly COLLECTION_NAME = 'object_relationships';

  constructor(private firestore: Firestore) {}

  /**
   * Create a new relationship between objects
   */
  createRelationship(relationship: Omit<ObjectRelationship, 'id'>): Observable<string> {
    const relationshipData = {
      ...relationship,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return from(addDoc(collection(this.firestore, this.COLLECTION_NAME), relationshipData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error creating relationship:', error);
        return throwError(() => new Error('Failed to create relationship'));
      })
    );
  }

  /**
   * Update an existing relationship
   */
  updateRelationship(id: string, updates: Partial<ObjectRelationship>): Observable<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error('Error updating relationship:', error);
        return throwError(() => new Error('Failed to update relationship'));
      })
    );
  }

  /**
   * Delete a relationship
   */
  deleteRelationship(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error('Error deleting relationship:', error);
        return throwError(() => new Error('Failed to delete relationship'));
      })
    );
  }

  /**
   * Get all relationships for a wall
   */
  getRelationshipsForWall(wallId: string): Observable<ObjectRelationship[]> {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('wallId', '==', wallId),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as ObjectRelationship))
      ),
      catchError(error => {
        console.error('Error getting relationships:', error);
        return throwError(() => new Error('Failed to get relationships'));
      })
    );
  }

  /**
   * Get relationships for a specific item
   */
  getRelationshipsForItem(itemId: string): Observable<ObjectRelationship[]> {
    const fromQuery = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('fromItemId', '==', itemId)
    );

    const toQuery = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('toItemId', '==', itemId)
    );

    return forkJoin({
      fromRelationships: from(getDocs(fromQuery)),
      toRelationships: from(getDocs(toQuery))
    }).pipe(
      map(({ fromRelationships, toRelationships }) => {
        const fromRels = fromRelationships.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as ObjectRelationship));

        const toRels = toRelationships.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as ObjectRelationship));

        // Combine and deduplicate
        const allRels = [...fromRels, ...toRels];
        return allRels.filter((rel, index, self) => 
          index === self.findIndex(r => r.id === rel.id)
        );
      }),
      catchError(error => {
        console.error('Error getting item relationships:', error);
        return throwError(() => new Error('Failed to get item relationships'));
      })
    );
  }

  /**
   * Create a relationship based on definition
   */
  createRelationshipFromDefinition(
    wallId: string,
    fromItemId: string,
    toItemId: string,
    relationshipDefinition: RelationshipDefinition,
    currentUserId: string,
    metadata?: { [key: string]: any }
  ): Observable<string> {
    // Validate relationship type constraints
    return this.validateRelationshipConstraints(
      fromItemId, 
      toItemId, 
      relationshipDefinition
    ).pipe(
      switchMap(isValid => {
        if (!isValid) {
          return throwError(() => new Error('Relationship violates constraints'));
        }

        const relationship: Omit<ObjectRelationship, 'id'> = {
          wallId,
          fromItemId,
          toItemId,
          relationshipDefinitionId: relationshipDefinition.id,
          metadata,
          createdBy: currentUserId,
          updatedBy: currentUserId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        return this.createRelationship(relationship).pipe(
          switchMap(relationshipId => {
            // If bidirectional, create reverse relationship
            if (relationshipDefinition.bidirectional) {
              const reverseRelationship: Omit<ObjectRelationship, 'id'> = {
                ...relationship,
                fromItemId: toItemId,
                toItemId: fromItemId
              };
              
              return this.createRelationship(reverseRelationship).pipe(
                map(() => relationshipId)
              );
            }
            
            return of(relationshipId);
          })
        );
      })
    );
  }

  /**
   * Validate relationship constraints
   */
  private validateRelationshipConstraints(
    fromItemId: string,
    toItemId: string,
    definition: RelationshipDefinition
  ): Observable<boolean> {
    // Check for circular relationships
    if (fromItemId === toItemId) {
      return of(false);
    }

    // Check relationship type constraints
    return this.getRelationshipsForItem(fromItemId).pipe(
      map(relationships => {
        const existingRelationships = relationships.filter(rel => 
          rel.relationshipDefinitionId === definition.id
        );

        switch (definition.relationshipType) {
          case 'one-to-one':
            // Can only have one relationship of this type
            return existingRelationships.length === 0;
          
          case 'one-to-many':
            // From item can have multiple, but to item can only have one
            const existingToRelationships = existingRelationships.filter(rel =>
              rel.toItemId === toItemId
            );
            return existingToRelationships.length === 0;
          
          case 'many-to-many':
            // No constraints
            return true;
          
          default:
            return false;
        }
      })
    );
  }

  /**
   * Remove all relationships for an item (when item is deleted)
   */
  removeAllRelationshipsForItem(itemId: string): Observable<void> {
    return this.getRelationshipsForItem(itemId).pipe(
      switchMap(relationships => {
        if (relationships.length === 0) {
          return of(void 0);
        }

        const deleteObservables = relationships.map(rel =>
          this.deleteRelationship(rel.id)
        );

        return forkJoin(deleteObservables).pipe(
          map(() => void 0)
        );
      })
    );
  }

  /**
   * Build relationship graph for visualization
   */
  buildRelationshipGraph(
    wallId: string,
    items: EnhancedWallItem[],
    relationshipDefinitions: RelationshipDefinition[]
  ): Observable<RelationshipGraph> {
    return this.getRelationshipsForWall(wallId).pipe(
      map(relationships => {
        // Build relationship paths
        const relationshipPaths: RelationshipPath[] = relationships.map(rel => {
          const fromItem = items.find(item => item.id === rel.fromItemId);
          const toItem = items.find(item => item.id === rel.toItemId);
          const definition = relationshipDefinitions.find(def => def.id === rel.relationshipDefinitionId);

          if (!fromItem || !toItem || !definition) {
            return null;
          }

          return {
            fromItem,
            toItem,
            relationship: rel,
            definition
          };
        }).filter(path => path !== null) as RelationshipPath[];

        // Build graph nodes
        const nodeMap = new Map<string, GraphNode>();
        items.forEach(item => {
          nodeMap.set(item.id, {
            id: item.id,
            item,
            connections: 0
          });
        });

        // Build graph edges
        const edges: GraphEdge[] = relationshipPaths.map(path => {
          // Count connections
          const fromNode = nodeMap.get(path.fromItem.id);
          const toNode = nodeMap.get(path.toItem.id);
          if (fromNode) fromNode.connections++;
          if (toNode) toNode.connections++;

          return {
            id: path.relationship.id,
            fromId: path.fromItem.id,
            toId: path.toItem.id,
            relationship: path,
            bidirectional: path.definition.bidirectional
          };
        });

        // Calculate layout positions (simple force-directed layout)
        const nodes = Array.from(nodeMap.values());
        this.calculateGraphLayout(nodes, edges);

        return {
          items,
          relationships: relationshipPaths,
          nodes,
          edges
        };
      })
    );
  }

  /**
   * Simple force-directed layout calculation
   */
  private calculateGraphLayout(nodes: GraphNode[], edges: GraphEdge[]): void {
    const width = 800;
    const height = 600;
    const iterations = 100;

    // Initialize positions randomly
    nodes.forEach(node => {
      node.x = Math.random() * width;
      node.y = Math.random() * height;
    });

    // Simple force-directed layout
    for (let i = 0; i < iterations; i++) {
      // Apply repulsive forces between all nodes
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const node1 = nodes[j];
          const node2 = nodes[k];
          
          const dx = node2.x! - node1.x!;
          const dy = node2.y! - node1.y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = 1000 / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          node1.x! -= fx;
          node1.y! -= fy;
          node2.x! += fx;
          node2.y! += fy;
        }
      }

      // Apply attractive forces for connected nodes
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.fromId);
        const toNode = nodes.find(n => n.id === edge.toId);
        
        if (fromNode && toNode) {
          const dx = toNode.x! - fromNode.x!;
          const dy = toNode.y! - fromNode.y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = distance * 0.01;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          fromNode.x! += fx;
          fromNode.y! += fy;
          toNode.x! -= fx;
          toNode.y! -= fy;
        }
      });

      // Keep nodes within bounds
      nodes.forEach(node => {
        node.x = Math.max(50, Math.min(width - 50, node.x!));
        node.y = Math.max(50, Math.min(height - 50, node.y!));
      });
    }
  }

  /**
   * Find shortest path between two items
   */
  findShortestPath(
    fromItemId: string,
    toItemId: string,
    relationshipGraph: RelationshipGraph
  ): RelationshipPath[] | null {
    const visited = new Set<string>();
    const queue: { itemId: string; path: RelationshipPath[] }[] = [
      { itemId: fromItemId, path: [] }
    ];

    while (queue.length > 0) {
      const { itemId, path } = queue.shift()!;
      
      if (itemId === toItemId) {
        return path;
      }

      if (visited.has(itemId)) {
        continue;
      }
      
      visited.add(itemId);

      // Find all connected items
      const connectedPaths = relationshipGraph.relationships.filter(rel =>
        rel.fromItem.id === itemId || 
        (rel.definition.bidirectional && rel.toItem.id === itemId)
      );

      connectedPaths.forEach(relationshipPath => {
        const nextItemId = relationshipPath.fromItem.id === itemId 
          ? relationshipPath.toItem.id 
          : relationshipPath.fromItem.id;

        if (!visited.has(nextItemId)) {
          queue.push({
            itemId: nextItemId,
            path: [...path, relationshipPath]
          });
        }
      });
    }

    return null; // No path found
  }

  /**
   * Get relationship statistics for a wall
   */
  getRelationshipStatistics(wallId: string): Observable<{
    totalRelationships: number;
    relationshipTypeBreakdown: { [type: string]: number };
    mostConnectedItems: { itemId: string; connectionCount: number }[];
    orphanedItems: string[];
  }> {
    return forkJoin({
      relationships: this.getRelationshipsForWall(wallId),
      // Note: Would need items from wall item service
    }).pipe(
      map(({ relationships }) => {
        // Count relationships by type
        const relationshipTypeBreakdown: { [type: string]: number } = {};
        relationships.forEach(rel => {
          const key = rel.relationshipDefinitionId;
          relationshipTypeBreakdown[key] = (relationshipTypeBreakdown[key] || 0) + 1;
        });

        // Count connections per item
        const connectionCounts = new Map<string, number>();
        relationships.forEach(rel => {
          connectionCounts.set(rel.fromItemId, (connectionCounts.get(rel.fromItemId) || 0) + 1);
          connectionCounts.set(rel.toItemId, (connectionCounts.get(rel.toItemId) || 0) + 1);
        });

        // Get most connected items
        const mostConnectedItems = Array.from(connectionCounts.entries())
          .map(([itemId, count]) => ({ itemId, connectionCount: count }))
          .sort((a, b) => b.connectionCount - a.connectionCount)
          .slice(0, 10);

        // Note: Would need to get orphaned items by comparing with all items in wall

        return {
          totalRelationships: relationships.length,
          relationshipTypeBreakdown,
          mostConnectedItems,
          orphanedItems: [] // Would need wall items to calculate
        };
      })
    );
  }
}