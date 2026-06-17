import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
export type AnalysisStatus = 'pending' | 'completed' | 'failed';

@Entity('user_polygons')
export class UserPolygon {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user?: User;

    @Column()
    name!: string;

    @Column('geometry', { spatialFeatureType: 'MultiPolygon', srid: 4326 })
    geometry!: any;

    @Column('double precision', { name: 'area_hectares' })
    areaHectares!: number;

    @Column('jsonb', { nullable: true, name: 'analysis_results' })
    analysisResults?: {
        plotCount?: number;
        speciesDistribution?: Array<{
            species: string;
            areaHectares: number;
            percentage: number;
        }>;
        forestTypes?: string[];
        totalForestArea?: number;
        coveragePercentage?: number;
    } | null;

    @Column({
        type: 'enum',
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    })
    status!: AnalysisStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}