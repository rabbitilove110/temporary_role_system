const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('역할추가')
        .setDescription('사용자에게 기간제 역할을 추가합니다.')
        .addIntegerOption(option =>
            option.setName('기간')
                .setDescription('역할이 유지될 기간 (일 단위)')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('추가할역할')
                .setDescription('사용자에게 추가할 역할')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('역할을 추가할 사용자')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async run(interaction) {
        const guild = interaction.guild;
        const targetUser = interaction.options.getUser('대상') || interaction.user;
        const days = interaction.options.getInteger('기간');
        const role = interaction.options.getRole('추가할역할');

        if (role.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: `제가 '${role.name}' 역할을 추가할 권한이 없습니다. 제 역할보다 낮은 역할만 추가할 수 있습니다.`, ephemeral: true });
        }

        if (role.id === guild.id || role.managed) {
            return interaction.reply({ content: `이 역할은 기간제로 추가할 수 없습니다.`, ephemeral: true });
        }

        const expirationDate = Date.now() + (days * 24 * 60 * 60 * 1000);

        try {
            const member = await guild.members.fetch(targetUser.id);

            if (member.roles.cache.has(role.id)) {
                const existingEntry = db.prepare('SELECT * FROM timed_roles WHERE guildId = ? AND userId = ? AND roleId = ?').get(guild.id, targetUser.id, role.id);
                if (existingEntry) {
                    db.prepare('UPDATE timed_roles SET expirationDate = ? WHERE guildId = ? AND userId = ? AND roleId = ?')
                      .run(expirationDate, guild.id, targetUser.id, role.id);
                    await interaction.reply({ content: `${targetUser.tag}님에게 '${role.name}' 역할의 기간이 ${days}일로 갱신되었습니다.`, ephemeral: true });
                } else {
                    db.prepare('INSERT INTO timed_roles (guildId, userId, roleId, expirationDate) VALUES (?, ?, ?, ?)')
                        .run(guild.id, targetUser.id, role.id, expirationDate);
                    await interaction.reply({ content: `${targetUser.tag}님에게 이미 '${role.name}' 역할이 있지만, ${days}일 동안 기간제 역할로 설정되었습니다.`, ephemeral: true });
                }
            } else {
                await member.roles.add(role);
                db.prepare('INSERT INTO timed_roles (guildId, userId, roleId, expirationDate) VALUES (?, ?, ?, ?)')
                    .run(guild.id, targetUser.id, role.id, expirationDate);
                await interaction.reply({ content: `${targetUser.tag}님에게 '${role.name}' 역할이 ${days}일 동안 추가되었습니다.`, ephemeral: true });
            }

        } catch (error) {
            console.error(`역할 추가 중 오류 발생:`, error);
            if (error.code === 50013) {
                return interaction.reply({ content: `역할을 추가할 권한이 없습니다. 봇의 역할 권한을 확인해주세요.`, ephemeral: true });
            }
            return interaction.reply({ content: `역할 추가 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`, ephemeral: true });
        }
    },
};